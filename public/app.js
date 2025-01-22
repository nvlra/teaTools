// Inisialisasi provider dan web3
let web3;
let provider;
let signer;
let connectedWallet;
let toastTimeout;

const CONTRACT_ADDRESS = "0xCA31A477d9B0b2951217222cd8aF068ae268D73a";
const DONATION_CONTRACT = "0x7f1F28fa2b7CE04b6C94A040a34ae8d50A5d35d1";
const CREATOR_CONTRACT = "0x957f6f2194706b2b49800fde60d3ddb83f84462b";
const CHAIN_ID = 93384;
const RPC_URL = "https://assam-rpc.tea.xyz";

// Pastikan ethers dan Web3 tersedia
if (typeof window.ethereum !== 'undefined') {
    console.log('Ethereum object detected');
    try {
        web3 = new Web3(window.ethereum);
        provider = new ethers.providers.Web3Provider(window.ethereum);
        console.log('Web3 initialized successfully');
    } catch (error) {
        console.error('Error initializing Web3:', error);
    }
} else {
    console.log('Ethereum object not found');
}

// Contract ABIs
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

const DONATION_ABI = [
    {
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "DonationForwarded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "donor",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "DonationReceived",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address payable",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "setOwner",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	},
	{
		"inputs": [],
		"name": "getBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address payable",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

const CREATOR_ABI = [
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "initialSupply",
                "type": "uint256"
            }
        ],
        "name": "deployToken",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "tokenAddress",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "totalSupply",
                "type": "uint256"
            }
        ],
        "name": "TokenCreated",
        "type": "event"
    }
];

// Utility Functions
function showToast(message, type = 'info') {
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
    
    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Modal and UI Functions
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
    
    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.replaceWith(button.cloneNode(true));
        const newButton = modal.querySelector('.close-modal');
        newButton.addEventListener('click', () => {
            hideModal(modal);
        });
    });
    
    modal.classList.add('active');
    overlay.classList.add('active');
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

// Wallet Functions
async function connectWallet() {
    console.log('connectWallet function called');
    try {
        if (typeof window.ethereum === 'undefined') {
            console.log('MetaMask not found');
            showToast('Please install MetaMask first', 'error');
            return false;
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });

        if (parseInt(chainId, 16) !== CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x' + CHAIN_ID.toString(16) }],
                });
            } catch (switchError) {
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

// Transaction Functions
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

async function processDonation() {
    if (!connectedWallet) {
        showToast('Please connect wallet first', 'error');
        return;
    }

    const donateBtn = document.getElementById('processDonation');
    const amount = document.getElementById('donationAmount').value;
    
    try {
        // Set loading state
        setLoading(donateBtn, true);
        
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }

        const donationAmount = ethers.utils.parseEther(amount.toString());
        
        // Check balance
        const balance = await provider.getBalance(connectedWallet);
        if (balance.lt(donationAmount)) {
            showToast('Insufficient TEA balance', 'error');
            return;
        }

        // Get optimal gas price
        const gasPrice = await getOptimalGasPrice();
        
        // Send donation transaction
        showToast('Processing donation...', 'info');
        const tx = await signer.sendTransaction({
            to: DONATION_CONTRACT,
            value: donationAmount,
            gasLimit: 100000,
            gasPrice: gasPrice
        });

        showToast('Waiting for confirmation...', 'info');
        await tx.wait();

        // Update balance after successful transaction
        await updateWalletInfo();

        // Show success modal
        const successModal = document.querySelector('.transaction-success');
        const details = `
            <div class="success-icon">✓</div>
            <h3>Donation Successful!</h3>
            <div class="transaction-details">
                <div>Amount: ${amount} TEA</div>
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
        document.getElementById('donationAmount').value = '';

    } catch (error) {
        console.error('Error in donation:', error);
        handleError(error, 'donation');
    } finally {
        // Reset loading state
        setLoading(donateBtn, false);
    }
}

// Tambahkan fungsi untuk token creator
async function createToken() {
    if (!connectedWallet) {
        showToast('Please connect your wallet first', 'error');
        return;
    }

    const createBtn = document.getElementById('createToken');
    const name = document.getElementById('tokenName').value;
    const symbol = document.getElementById('tokenSymbol').value;
    const supply = document.getElementById('tokenSupply').value;

    try {
        setLoading(createBtn, true);

        // Debug log
        console.log('Connected wallet:', connectedWallet);
        const balance = await provider.getBalance(connectedWallet);
        console.log('Wallet balance:', ethers.utils.formatEther(balance), 'TEA');

        // Input validation
        if (!name || name.trim() === '') {
            showToast('Please enter token name', 'error');
            return;
        }
        if (!symbol || symbol.trim() === '') {
            showToast('Please enter token symbol', 'error');
            return;
        }
        if (!supply || isNaN(supply) || parseFloat(supply) <= 0) {
            showToast('Please enter a valid supply amount', 'error');
            return;
        }

        const creatorContract = new ethers.Contract(
            CREATOR_CONTRACT,
            CREATOR_ABI,
            signer
        );

        // Debug log contract
        console.log('Creator contract address:', CREATOR_CONTRACT);
        
        // Convert supply to BigNumber with 18 decimals
        const initialSupply = ethers.utils.parseUnits(supply.toString(), 18);
        console.log('Initial supply (in wei):', initialSupply.toString());

        // Set higher gas price
        const gasPrice = await provider.getGasPrice();
        const adjustedGasPrice = gasPrice.mul(150).div(100); // Add 50%
        console.log('Adjusted gas price:', ethers.utils.formatUnits(adjustedGasPrice, 'gwei'), 'gwei');

        // Set high gas limit for deployment
        const gasLimit = 5000000; // Set fixed high gas limit
        console.log('Gas limit:', gasLimit);

        console.log('Deploying token with params:', {
            name: name.trim(),
            symbol: symbol.trim().toUpperCase(),
            supply: initialSupply.toString(),
            gasLimit: gasLimit,
            gasPrice: adjustedGasPrice.toString()
        });

        // Deploy token with prepared parameters
        const tx = await creatorContract.deployToken(
            name.trim(),
            symbol.trim().toUpperCase(),
            initialSupply,
            {
                gasLimit: gasLimit,
                gasPrice: adjustedGasPrice
            }
        );

        console.log('Transaction hash:', tx.hash);
        showToast('Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        console.log('Transaction receipt:', receipt);

        // Get token address from event
        const tokenCreatedEvent = receipt.events?.find(e => e.event === "TokenCreated");
        const tokenAddress = tokenCreatedEvent?.args?.tokenAddress;
        console.log('New token address:', tokenAddress);

        // Show success modal
        const successModal = document.querySelector('.transaction-success');
        const details = `
            <div class="success-icon">✓</div>
            <h3>Token Created Successfully!</h3>
            <div class="transaction-details">
                <div>Token Name: ${name}</div>
                <div>Token Symbol: ${symbol}</div>
                <div>Total Supply: ${supply} ${symbol}</div>
                <div>Token Address: ${tokenAddress}</div>
                <div class="tx-hash">
                    <a href="https://explorer-tea-assam-fo46m5b966.t.conduit.xyz/tx/${tx.hash}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="tx-hash-link">
                        View on Explorer
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
        document.getElementById('tokenName').value = '';
        document.getElementById('tokenSymbol').value = '';
        document.getElementById('tokenSupply').value = '';

    } catch (error) {
        console.error('Detailed error:', {
            code: error.code,
            message: error.message,
            stack: error.stack,
            data: error.data
        });
        
        if (error.code === 4001) {
            showToast('Transaction rejected by user', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showToast('Insufficient TEA for gas fee', 'error');
        } else {
            showToast('Error creating token: ' + (error.reason || error.message), 'error');
        }
    } finally {
        setLoading(createBtn, false);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    initializeNavigation();
    
    const connectBtn = document.querySelector('.connect-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            await connectWallet();
        });
    }
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    const buttons = {
        'checkTransfer': checkToken,
        'processTransfer': processBatchTransfer,
        'speedUpProcess': speedUpByTxHash,
        'processDonation': processDonation,
        'createToken': createToken
    };

    for (const [id, handler] of Object.entries(buttons)) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
        }
    }
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            hideModal(modal);
        });
    });
    
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            document.querySelectorAll('.modal.active').forEach(modal => {
                hideModal(modal);
            });
        });
    }
});

// Check if already connected and setup event listeners
if (window.ethereum?.selectedAddress) {
    connectWallet();
}

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

// Validation Functions
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
            case 4001: message = 'Transaction rejected by user'; break;
            case -32603: message = 'Internal JSON-RPC error'; break;
            case -32002: message = 'Request already pending'; break;
            default: message = error.message || 'Unknown error occurred';
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