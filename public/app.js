// Inisialisasi provider dan web3
let web3;
let provider;
let signer;
let connectedWallet;
let toastTimeout;

const CONTRACT_ADDRESS = "0xCA31A477d9B0b2951217222cd8aF068ae268D73a";
const CHAIN_ID = 93384;
const RPC_URL = "https://assam-rpc.tea.xyz";

// Pastikan ethers dan Web3 tersedia
if (typeof window.ethereum !== 'undefined') {
    console.log('Ethereum object detected'); // Debug log
    try {
        web3 = new Web3(window.ethereum);
        provider = new ethers.providers.Web3Provider(window.ethereum);
        console.log('Web3 initialized successfully'); // Debug log
    } catch (error) {
        console.error('Error initializing Web3:', error); // Debug log
    }
} else {
    console.log('Ethereum object not found'); // Debug log
}

const CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "token", "type": "address"},
            {"internalType": "address[]", "name": "recipients", "type": "address[]"},
            {"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}
        ],
        "name": "batchTransfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const ERC20_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "spender", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "address", "name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Utility Functions
function showToast(message, type = 'info') {
    // Clear existing timeout if there is one
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // Remove existing toasts with the same message
    document.querySelectorAll('.toast').forEach(toast => {
        if (toast.textContent === message) {
            toast.remove();
        }
    });

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const container = document.querySelector('.toast-container') || createToastContainer();
    container.appendChild(toast);
    
    // Set new timeout
    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showModal(modal, content = '') {
    const overlay = document.querySelector('.modal-overlay');
    
    if (content) {
        modal.querySelector('.result-content, .pending-content, .modal-content').innerHTML = content;
    }
    
    // Add event listeners for close buttons
    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        // Remove existing listeners first to prevent duplicates
        button.replaceWith(button.cloneNode(true));
        const newButton = modal.querySelector('.close-modal');
        newButton.addEventListener('click', () => {
            hideModal(modal);
        });
    });
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

function showSuccessModal(tx) {
    const successModal = document.querySelector('.transaction-success');
    const explorerUrl = 'https://explorer-tea-assam-fo46m5b966.t.conduit.xyz/tx/';
    
    const details = `
        <div class="success-icon">✓</div>
        <h3>Transaction Successful!</h3>
        <div class="transaction-details">
            <div>Transaction Hash:</div>
            <div class="tx-hash">
                <a href="${explorerUrl}${tx.hash}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="tx-hash-link">
                    ${tx.hash}
                </a>
            </div>
        </div>
    `;
    
    successModal.querySelector('.modal-content').innerHTML = details;
    showModal(successModal);
}

function setProcessButtonLoading(isLoading) {
    const processBtn = document.querySelector('.process-btn');
    if (isLoading) {
        processBtn.disabled = true;
        processBtn.classList.add('loading');
    } else {
        processBtn.disabled = false;
        processBtn.classList.remove('loading');
    }
}

function hideModal(modal) {
    const overlay = document.querySelector('.modal-overlay');
    modal.classList.remove('active');
    overlay.classList.remove('active');
}

function setLoading(element, isLoading) {
    if (isLoading) {
        element.disabled = true;
        element.classList.add('loading');
    } else {
        element.disabled = false;
        element.classList.remove('loading');
    }
}

// Wallet Connection
async function connectWallet() {
    console.log('connectWallet function called'); // Debug log
    try {
        if (typeof window.ethereum === 'undefined') {
            console.log('MetaMask not found'); // Debug log
            showToast('Please install MetaMask first', 'error');
            return false;
        }

        console.log('Requesting accounts...'); // Debug log
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log('Accounts:', accounts); // Debug log

        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log('Current chainId:', chainId); // Debug log

        if (parseInt(chainId, 16) !== CHAIN_ID) {
            try {
                console.log('Switching network...'); // Debug log
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x' + CHAIN_ID.toString(16) }],
                });
            } catch (switchError) {
                console.log('Switch error:', switchError); // Debug log
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x' + CHAIN_ID.toString(16),
                                chainName: 'Tea Assam',
                                nativeCurrency: {
                                    name: 'TEA',
                                    symbol: 'TEA',
                                    decimals: 18
                                },
                                rpcUrls: [RPC_URL],
                                blockExplorerUrls: ['https://explorer-tea-assam-fo46m5b966.t.conduit.xyz']
                            }]
                        });
                    } catch (addError) {
                        console.error('Add network error:', addError);
                        showToast('Failed to add Tea Network', 'error');
                        return false;
                    }
                } else {
                    showToast('Please switch to Tea Network', 'error');
                    return false;
                }
            }
        }

        connectedWallet = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        console.log('Wallet connected:', connectedWallet);
        
        await updateWalletInfo();
        showToast('Wallet connected successfully', 'success');
        return true;

    } catch (error) {
        console.error('Error connecting wallet:', error);
        showToast(error.message || 'Failed to connect wallet', 'error');
        return false;
    }
}

async function updateWalletInfo() {
    if (!connectedWallet) return;
    
    const connectBtn = document.querySelector('.connect-btn');
    const shortAddress = `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`;
    
    if (!document.querySelector('.wallet-info')) {
        const walletInfo = document.createElement('div');
        walletInfo.className = 'wallet-info';
        walletInfo.innerHTML = `
            <div class="wallet-details">
                <div class="wallet-address" title="Click to copy">${shortAddress}</div>
                <div class="wallet-balance">Loading...</div>
            </div>
            <button class="disconnect-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
            </button>
        `;
        
        connectBtn.parentNode.replaceChild(walletInfo, connectBtn);
        
        // Add click handlers
        document.querySelector('.wallet-address').addEventListener('click', () => {
            navigator.clipboard.writeText(connectedWallet);
            showToast('Address copied to clipboard', 'success');
        });

        document.querySelector('.disconnect-btn').addEventListener('click', disconnectWallet);
    }
    
    try {
        const balance = await web3.eth.getBalance(connectedWallet);
        const teaBalance = web3.utils.fromWei(balance, 'ether');
        document.querySelector('.wallet-balance').textContent = `${parseFloat(teaBalance).toFixed(2)} TEA`;
    } catch (error) {
        console.error('Error fetching balance:', error);
        document.querySelector('.wallet-balance').textContent = 'Error loading balance';
    }
}

// Add disconnect function
async function disconnectWallet() {
    try {
        // Clear any stored wallet info
        localStorage.removeItem('lastConnectedWallet');
        connectedWallet = null;
        
        // Reset UI
        const walletInfo = document.querySelector('.wallet-info');
        const connectBtn = document.createElement('button');
        connectBtn.className = 'connect-btn';
        connectBtn.textContent = 'Connect';
        connectBtn.addEventListener('click', connectWallet);
        
        walletInfo.parentNode.replaceChild(connectBtn, walletInfo);
        
        showToast('Wallet disconnected', 'success');
        
        // Reload page to reset all states
        setTimeout(() => {
            location.reload();
        }, 1000);
    } catch (error) {
        console.error('Error disconnecting wallet:', error);
        showToast('Error disconnecting wallet', 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded'); // Debug log
    
    // Initialize Navigation
    initializeNavigation();
    
    // Connect wallet button
    const connectBtn = document.querySelector('.connect-btn');
    if (connectBtn) {
        console.log('Connect button found'); // Debug log
        connectBtn.addEventListener('click', async () => {
            console.log('Connect button clicked'); // Debug log
            await connectWallet();
        });
    } else {
        console.error('Connect button not found!'); // Debug log
    }
    
    // Add event listeners
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // Add other button listeners
    const buttons = {
        'checkTransfer': checkToken,
        'processTransfer': processBatchTransfer,
        'speedUpProcess': speedUpByTxHash  // Update ini
    };

    for (const [id, handler] of Object.entries(buttons)) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
        }
    }
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            hideModal(modal);
        });
    });
    
    // Modal overlay click
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            document.querySelectorAll('.modal.active').forEach(modal => {
                hideModal(modal);
            });
        });
    }
});

// Check if already connected
if (window.ethereum?.selectedAddress) {
    connectWallet();
}

// Listen for account changes
if (window.ethereum) {
    ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
            connectedWallet = accounts[0];
            await updateWalletInfo();
        } else {
            location.reload();
        }
    });

    ethereum.on('chainChanged', () => {
        location.reload();
    });

    ethereum.on('disconnect', () => {
        localStorage.removeItem('lastConnectedWallet');
        location.reload();
    });
}

// Navigation Functions
function initializeNavigation() {
    document.querySelectorAll('[data-page]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = button.getAttribute('data-page');
            if (targetPage) navigateToPage(targetPage);
        });
    });
}

function navigateToPage(pageId) {
    document.querySelectorAll('.rectangle').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
    }
}

// Batch Transfer Functions
async function checkToken() {
    if (!connectedWallet) {
        showToast('Please connect wallet first', 'error');
        return;
    }

    const tokenAddress = document.getElementById('tokenAddress').value;
    const amount = document.getElementById('sendAmount').value;
    const addresses = document.getElementById('addressList').value
        .split('\n')
        .map(addr => addr.trim())
        .filter(addr => ethers.utils.isAddress(addr));
    
    const modal = document.querySelector('.check-result-modal');
    const processBtn = modal.querySelector('.process-btn');
    
    if (!ethers.utils.isAddress(tokenAddress)) {
        showToast('Please enter a valid token address', 'error');
        return;
    }

    try {
        showModal(modal, `
            <div class="checking-animation">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `);

        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [symbol, decimals, name] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.decimals(),
            tokenContract.name()
        ]);

        const totalAmount = amount * addresses.length;
        
        const content = `
            <h3>Transfer Details</h3>
            <div class="result-content">
                <div class="token-info">
                    <h4>${name} (${symbol})</h4>
                    <p class="decimals">Decimals: ${decimals}</p>
                </div>
                <div class="transfer-details">
                    <p>Amount per address: ${amount} ${symbol}</p>
                    <p>Total addresses: ${addresses.length}</p>
                    <p class="total">Total amount to send: ${totalAmount} ${symbol}</p>
                </div>
            </div>
            <div class="modal-actions">
                <button class="process-btn" id="processTransfer">Process Now</button>
                <button class="close-modal">Cancel</button>
            </div>
        `;
        
        modal.querySelector('.modal-content').innerHTML = content;
        
        // Re-add event listeners
        const newProcessBtn = modal.querySelector('.process-btn');
        newProcessBtn.addEventListener('click', processBatchTransfer);
        
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => hideModal(modal));
        
        // Enable/disable process button
        newProcessBtn.disabled = addresses.length === 0 || !amount;

    } catch (error) {
        console.error('Error checking token:', error);
        const errorContent = `
            <h3>Transfer Details</h3>
            <div class="error-message">
                <p>Error loading token information</p>
                <p class="details">Please verify the token address and try again</p>
            </div>
            <div class="modal-actions">
                <button class="close-modal">Close</button>
            </div>
        `;
        modal.querySelector('.modal-content').innerHTML = errorContent;
    }
}

// Helper function untuk menghitung gas price berdasarkan network condition
async function getOptimalGasPrice() {
    try {
        // Get current gas price dan pending transactions count
        const [currentGasPrice, pendingCount] = await Promise.all([
            provider.getGasPrice(),
            provider.getTransactionCount(connectedWallet, "pending")
        ]);

        const baseGasPrice = ethers.utils.parseUnits('150', 'gwei'); // Base 150 Gwei
        let multiplier = 100; // Default multiplier (1x)

        // Jika ada pending transactions, tingkatkan multiplier
        if (pendingCount > 0) {
            multiplier = 300; // 3x jika ada pending
        } else {
            // Cek current gas price relatif terhadap base
            if (currentGasPrice.gt(baseGasPrice)) {
                multiplier = 200; // 2x jika network busy
            }
        }

        const optimalGasPrice = baseGasPrice.mul(multiplier).div(100);
        console.log('Network condition:', pendingCount > 0 ? 'Congested' : 'Normal');
        console.log('Gas price multiplier:', multiplier/100 + 'x');
        
        return optimalGasPrice;
    } catch (error) {
        console.error('Error calculating gas price:', error);
        return ethers.utils.parseUnits('150', 'gwei'); // Fallback ke 150 Gwei
    }
}

// Helper function untuk mendapatkan safe nonce
async function getSafeNonce() {
    try {
        const [latestNonce, pendingNonce] = await Promise.all([
            provider.getTransactionCount(connectedWallet, "latest"),
            provider.getTransactionCount(connectedWallet, "pending")
        ]);
        
        return pendingNonce > latestNonce ? pendingNonce : latestNonce;
    } catch (error) {
        console.error('Error getting nonce:', error);
        return provider.getTransactionCount(connectedWallet, "latest");
    }
}

async function processBatchTransfer() {
    if (!connectedWallet) {
        showToast('Please connect wallet first', 'error');
        return;
    }
 
    const tokenAddress = document.getElementById('tokenAddress').value;
    const amount = document.getElementById('sendAmount').value;
    const addresses = document.getElementById('addressList').value
        .split('\n')
        .map(addr => addr.trim())
        .filter(addr => ethers.utils.isAddress(addr));
    
    try {
        setProcessButtonLoading(true);
        
        if (!ethers.utils.isAddress(tokenAddress)) {
            showToast('Invalid token address', 'error');
            return;
        }
 
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            showToast('Invalid amount', 'error');
            return;
        }
 
        if (addresses.length === 0) {
            showToast('No valid addresses found', 'error');
            return;
        }
        
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const batchContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        try {
            const [decimals, symbol, name] = await Promise.all([
                tokenContract.decimals(),
                tokenContract.symbol(),
                tokenContract.name()
            ]);
            
            const amountWithDecimals = ethers.utils.parseUnits(amount.toString(), decimals);
            const totalAmount = amountWithDecimals.mul(addresses.length);
 
            // Get current transaction count (nonce) for latest and pending
            const [latestNonce, pendingNonce] = await Promise.all([
                provider.getTransactionCount(connectedWallet, "latest"),
                provider.getTransactionCount(connectedWallet, "pending")
            ]);
 
            // Use the higher nonce to ensure transaction order
            const safeNonce = pendingNonce > latestNonce ? pendingNonce : latestNonce;
            
            // Set base gas price
            const baseGasPrice = ethers.utils.parseUnits('150', 'gwei');
            let gasPrice = baseGasPrice;
 
            // Increase gas price if there are pending transactions
            if (pendingNonce > latestNonce) {
                gasPrice = baseGasPrice.mul(3); // 3x if pending exists
            }
 
            // Check user's token balance
            const balance = await tokenContract.balanceOf(connectedWallet);
            if (balance.lt(totalAmount)) {
                showToast(`Insufficient ${symbol} balance`, 'error');
                return;
            }
            
            // Check allowance with higher gas price
            const allowance = await tokenContract.allowance(connectedWallet, CONTRACT_ADDRESS);
            if (allowance.lt(totalAmount)) {
                showToast(`Approving ${symbol} token transfer...`, 'info');
                try {
                    const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, totalAmount, {
                        gasPrice: gasPrice,
                        nonce: safeNonce,
                        gasLimit: ethers.utils.hexlify(500000) // Fixed high gas limit for approvals
                    });
                    const approveReceipt = await approveTx.wait();
                    showToast('Token approval successful', 'success');
                } catch (approveError) {
                    if (approveError.code === 4001) {
                        showToast('Token approval rejected', 'error');
                    } else {
                        showToast('Error approving token', 'error');
                    }
                    console.error('Approve error:', approveError);
                    return;
                }
            }
            
            // Get next nonce after approval
            const transferNonce = await provider.getTransactionCount(connectedWallet, "latest");
            
            // Check if user has enough TEA for gas
            const gasLimit = await batchContract.estimateGas.batchTransfer(
                tokenAddress,
                addresses,
                Array(addresses.length).fill(amountWithDecimals)
            );
            const gasCost = gasLimit.mul(gasPrice);
            const ethBalance = await provider.getBalance(connectedWallet);
            
            if (ethBalance.lt(gasCost)) {
                showToast('Insufficient TEA for gas fee', 'error');
                return;
            }
            
            // Batch transfer with optimized gas settings
            showToast('Processing transfer...', 'info');
            const tx = await batchContract.batchTransfer(
                tokenAddress,
                addresses,
                Array(addresses.length).fill(amountWithDecimals),
                {
                    gasPrice: gasPrice,
                    gasLimit: gasLimit.mul(130).div(100), // 30% buffer
                    nonce: transferNonce
                }
            );
            
            showToast('Waiting for transaction confirmation...', 'info');
            const receipt = await tx.wait();
            
            // Show success modal with explorer link
            const successModal = document.querySelector('.transaction-success');
            const details = `
                <div class="success-icon">✓</div>
                <h3>Transfer Successful!</h3>
                <div class="transaction-details">
                    <div>Successfully sent ${amount} ${symbol} to ${addresses.length} addresses</div>
                    <div class="tx-hash">
                        <a href="https://explorer-tea-assam-fo46m5b966.t.conduit.xyz/tx/${tx.hash}" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="tx-hash-link">
                            ${tx.hash}
                        </a>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="close-modal">Close</button>
                </div>
            `;
            
            successModal.querySelector('.modal-content').innerHTML = details;
            showModal(successModal);
            
            // Reset form
            document.getElementById('tokenAddress').value = '';
            document.getElementById('sendAmount').value = '';
            document.getElementById('addressList').value = '';
            
        } catch (error) {
            console.error('Contract interaction error:', error);
            if (error.code === 4001) {
                showToast('Transaction rejected by user', 'error');
            } else if (error.message && error.message.includes('insufficient funds')) {
                showToast('Insufficient funds for gas', 'error');
            } else {
                showToast(error.message || 'Error processing transfer', 'error');
            }
        }
        
    } catch (error) {
        console.error('Error in batch transfer:', error);
        showToast(error.message || 'Error processing batch transfer', 'error');
    } finally {
        setProcessButtonLoading(false);
        hideModal(document.querySelector('.check-result-modal'));
    }
 }
 
 // Transaction monitoring function
 function monitorTransaction(txHash) {
    const checkStatus = async () => {
        try {
            const tx = await provider.getTransaction(txHash);
            if (tx && tx.blockNumber) {
                // Transaction confirmed
                hideModal(document.querySelector('.check-result-modal'));
                const receipt = await tx.wait();
                showSuccessModal(tx);
                return;
            }
            // Check again after 2 seconds
            setTimeout(checkStatus, 2000);
        } catch (error) {
            console.error('Error monitoring transaction:', error);
        }
    };
    checkStatus();
 }

// File Upload Handler
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const addresses = text.split('\n')
            .map(addr => addr.trim())
            .filter(addr => addr && ethers.utils.isAddress(addr));
            
        if (addresses.length === 0) {
            showToast('No valid addresses found in file', 'error');
            return;
        }
        
        document.getElementById('addressList').value = addresses.join('\n');
        showToast(`Loaded ${addresses.length} addresses successfully`, 'success');
        
    } catch (error) {
        console.error('Error reading file:', error);
        showToast('Error reading file', 'error');
    }
}

// Speed Up Transaction Functions
async function checkPendingTransactions() {
    if (!connectedWallet) {
        showToast('Please connect wallet first', 'error');
        return;
    }

    const address = document.getElementById('userAddress').value;
    const modal = document.querySelector('.pending-tx-modal');
    const speedUpBtn = modal.querySelector('.speed-up-btn');
    
    if (!ethers.utils.isAddress(address)) {
        showToast('Please enter a valid address', 'error');
        return;
    }

    try {
        showModal(modal, `
            <div class="checking-animation">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `);

        // Get the latest nonce (completed transactions)
        const latestNonce = await provider.getTransactionCount(address, 'latest');
        // Get the pending nonce
        const pendingNonce = await provider.getTransactionCount(address, 'pending');

        // If pendingNonce > latestNonce, there are pending transactions
        const hasPendingTx = pendingNonce > latestNonce;

        // Get the last few blocks to check for pending transactions
        const blockNumber = await provider.getBlockNumber();
        const block = await provider.getBlock(blockNumber);
        const pendingTxs = [];

        // Check mempool for pending transactions
        const txPool = await provider.send('eth_getBlockByNumber', ['pending', true]);
        if (txPool && txPool.transactions) {
            const addressPendingTxs = txPool.transactions.filter(tx => 
                tx.from.toLowerCase() === address.toLowerCase()
            );
            pendingTxs.push(...addressPendingTxs);
        }

        let content;
        if (pendingTxs.length > 0) {
            content = `
                <div class="address-info">
                    <span class="address">${address}</span>
                </div>
                <div class="pending-list">
                    ${pendingTxs.map(tx => `
                        <div class="pending-tx-item">
                            <p class="tx-hash">Hash: ${tx.hash}</p>
                            <p class="tx-value">Value: ${ethers.utils.formatEther(tx.value)} TEA</p>
                            <p class="tx-fee">Gas Price: ${ethers.utils.formatUnits(tx.gasPrice, 'gwei')} Gwei</p>
                            <p class="tx-nonce">Nonce: ${tx.nonce}</p>
                        </div>
                    `).join('')}
                </div>
            `;
            speedUpBtn.disabled = false;
        } else {
            content = `
                <div class="status-message">
                    No pending transactions found for this address
                </div>
            `;
            speedUpBtn.disabled = true;
        }

        showModal(modal, content);

    } catch (error) {
        console.error('Error checking transactions:', error);
        const errorContent = `
            <div class="error-message">
                <p>Error checking transactions</p>
                <p class="details">Please try again later</p>
            </div>
        `;
        showModal(modal, errorContent);
        speedUpBtn.disabled = true;
    }
}

// Function to speed up transaction
// Fungsi untuk menangani error dengan lebih detail
function handleTransactionError(error) {
    console.error('Transaction error:', error);
    
    // Penanganan error spesifik
    if (error.code === -32603) {
        showToast('Network is congested. Please try again later.', 'error');
    } else if (error.code === 4001) {
        showToast('Transaction rejected by user', 'error');
    } else if (error.message && error.message.includes('insufficient funds')) {
        showToast('Insufficient funds for gas fee', 'error');
    } else if (error.message && error.message.includes('nonce')) {
        showToast('Transaction nonce error. Please refresh and try again', 'error');
    } else {
        showToast(error.message || 'Transaction failed. Please try again', 'error');
    }
}

// Update fungsi speedUpByTxHash dengan penanganan error yang lebih baik
async function speedUpByTxHash() {
    if (!connectedWallet) {
        showToast('Please connect wallet first', 'error');
        return;
    }
 
    const txHash = document.getElementById('txHash').value.trim();
    
    if (!txHash || txHash.length !== 66 || !txHash.startsWith('0x')) {
        showToast('Please enter a valid transaction hash', 'error');
        return;
    }
 
    try {
        const speedUpBtn = document.getElementById('speedUpProcess');
        setLoading(speedUpBtn, true);
 
        // Cek koneksi ke network
        try {
            await provider.getNetwork();
        } catch (error) {
            showToast('Network connection error. Please check your connection', 'error');
            return;
        }
 
        // Get the original transaction dengan timeout
        const tx = await Promise.race([
            provider.getTransaction(txHash),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 15000)
            )
        ]);
        
        if (!tx) {
            showToast('Transaction not found or network error', 'error');
            return;
        }
 
        if (tx.from.toLowerCase() !== connectedWallet.toLowerCase()) {
            showToast('You can only speed up your own transactions', 'error');
            return;
        }
 
        // Get base gas price dan pending count
        const [latestNonce, pendingNonce] = await Promise.all([
            provider.getTransactionCount(connectedWallet, "latest"),
            provider.getTransactionCount(connectedWallet, "pending")
        ]);
 
        // Set base gas price
        const baseGasPrice = ethers.utils.parseUnits('150', 'gwei');
        let newGasPrice = baseGasPrice;
 
        // Increase gas price if there are pending transactions
        if (pendingNonce > latestNonce) {
            newGasPrice = baseGasPrice.mul(3); // 3x if pending exists
        }
 
        // Ensure new gas price is higher than original
        if (tx.gasPrice.gt(newGasPrice)) {
            newGasPrice = tx.gasPrice.mul(2); // Double the original if it's higher than our calculation
        }
        
        // Cek balance untuk gas
        const balance = await provider.getBalance(connectedWallet);
        const estimatedGas = tx.gasLimit.mul(newGasPrice);
        
        if (balance.lt(estimatedGas)) {
            showToast('Insufficient balance for gas fee', 'error');
            return;
        }
 
        const speedUpTx = {
            to: tx.to,
            from: tx.from,
            nonce: tx.nonce,
            data: tx.data,
            value: tx.value,
            gasLimit: tx.gasLimit.mul(130).div(100), // Add 30% buffer
            gasPrice: newGasPrice,
            chainId: tx.chainId
        };
 
        try {
            showToast('Processing speed up...', 'info');
            const txResponse = await signer.sendTransaction(speedUpTx);
            showToast('Waiting for confirmation...', 'info');
            await txResponse.wait();
 
            // Show success modal
            const successModal = document.querySelector('.transaction-success');
            const details = `
                <div class="success-icon">✓</div>
                <h3>Speed Up Successful!</h3>
                <div class="transaction-details">
                    <div>New Transaction Hash:</div>
                    <div class="tx-hash">
                        <a href="https://explorer-tea-assam-fo46m5b966.t.conduit.xyz/tx/${txResponse.hash}" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="tx-hash-link">
                            ${txResponse.hash}
                        </a>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="close-modal">Close</button>
                </div>
            `;
            
            successModal.querySelector('.modal-content').innerHTML = details;
            showModal(successModal);
 
            // Reset form
            document.getElementById('txHash').value = '';
 
        } catch (sendError) {
            if (sendError.code === 4001) {
                showToast('Transaction rejected by user', 'error');
            } else if (sendError.message && sendError.message.includes('insufficient funds')) {
                showToast('Insufficient funds for gas', 'error');
            } else if (sendError.message && sendError.message.includes('nonce')) {
                showToast('Transaction already confirmed or replaced', 'error');
            } else {
                showToast(sendError.message || 'Error speeding up transaction', 'error');
            }
            console.error('Send transaction error:', sendError);
        }
 
    } catch (error) {
        console.error('Error in speed up:', error);
        if (error.message === 'Request timeout') {
            showToast('Network request timeout. Please try again', 'error');
        } else {
            showToast(error.message || 'Error speeding up transaction', 'error');
        }
    } finally {
        setLoading(document.getElementById('speedUpProcess'), false);
    }
 }

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded'); // Debug log
    
    // Initialize Navigation
    initializeNavigation();
    
    // Connect wallet button
    const connectBtn = document.querySelector('.connect-btn');
    if (connectBtn) {
        console.log('Connect button found'); // Debug log
        connectBtn.addEventListener('click', async () => {
            console.log('Connect button clicked'); // Debug log
            await connectWallet();
        });
    } else {
        console.error('Connect button not found!'); // Debug log
    }
    
    // Add event listeners
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // Add other button listeners
    const buttons = {
        'checkTransfer': checkToken,
        'processTransfer': processBatchTransfer,
        'speedUpProcess': speedUpByTxHash  // Update ini
    };

    for (const [id, handler] of Object.entries(buttons)) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
        }
    }
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            hideModal(modal);
        });
    });
    
    // Modal overlay click
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            document.querySelectorAll('.modal.active').forEach(modal => {
                hideModal(modal);
            });
        });
    }
});

// Check if already connected
if (window.ethereum?.selectedAddress) {
    connectWallet();
}

// Listen for account changes
if (window.ethereum) {
    ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
            connectedWallet = accounts[0];
            await updateWalletInfo();
        } else {
            location.reload();
        }
    });

    ethereum.on('chainChanged', () => {
        location.reload();
    });

    ethereum.on('disconnect', () => {
        localStorage.removeItem('lastConnectedWallet');
        location.reload();
    });
}

// Navigation Functions
function initializeNavigation() {
    document.querySelectorAll('[data-page]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = button.getAttribute('data-page');
            if (targetPage) navigateToPage(targetPage);
        });
    });
}

function navigateToPage(pageId) {
    document.querySelectorAll('.rectangle').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
    }
}

// Form Validation Functions
function validateTokenAddress(address) {
    return ethers.utils.isAddress(address);
}

function validateAmount(amount) {
    return !isNaN(amount) && parseFloat(amount) > 0;
}

function validateAddressList(addresses) {
    if (!addresses || addresses.length === 0) return false;
    return addresses.every(addr => ethers.utils.isAddress(addr));
}

// Additional Utility Functions
function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAmount(amount, decimals = 18) {
    return ethers.utils.formatUnits(amount, decimals);
}

function parseAmount(amount, decimals = 18) {
    return ethers.utils.parseUnits(amount.toString(), decimals);
}

// Error Handling Functions
function handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    let message = 'An error occurred';
    
    if (error.code) {
        switch (error.code) {
            case 4001:
                message = 'Transaction rejected by user';
                break;
            case -32603:
                message = 'Internal JSON-RPC error';
                break;
            case -32002:
                message = 'Request already pending';
                break;
            default:
                message = error.message || 'Unknown error occurred';
        }
    }
    
    showToast(message, 'error');
}

// Network Management Functions
async function checkNetwork() {
    if (!window.ethereum) return false;
    
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        return parseInt(chainId, 16) === CHAIN_ID;
    } catch (error) {
        console.error('Error checking network:', error);
        return false;
    }
}

async function switchNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + CHAIN_ID.toString(16) }],
        });
        return true;
    } catch (error) {
        if (error.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x' + CHAIN_ID.toString(16),
                        chainName: 'Tea Assam',
                        nativeCurrency: {
                            name: 'TEA',
                            symbol: 'TEA',
                            decimals: 18
                        },
                        rpcUrls: [RPC_URL],
                        blockExplorerUrls: ['https://explorer-tea-assam-fo46m5b966.t.conduit.xyz']
                    }]
                });
                return true;
            } catch (addError) {
                console.error('Error adding network:', addError);
                return false;
            }
        }
        return false;
    }
}

// Token Management Functions
async function getTokenInfo(tokenAddress) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [name, symbol, decimals] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals()
        ]);
        
        return { name, symbol, decimals };
    } catch (error) {
        console.error('Error getting token info:', error);
        throw error;
    }
}

async function checkTokenAllowance(tokenAddress, owner, spender) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        return await tokenContract.allowance(owner, spender);
    } catch (error) {
        console.error('Error checking allowance:', error);
        throw error;
    }
}

// Initialize app when document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing app...');
    initializeNavigation();
    if (window.ethereum?.selectedAddress) {
        connectWallet();
    }
});