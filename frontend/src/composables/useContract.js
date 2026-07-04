import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ethers } from 'ethers'

const CONTRACT_ADDRESS = '0x84a63476C47eDA66Aa23838149F65f972fea08Fe'

const ABI = [
  {
    "inputs": [],
    "name": "acceptOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_addr",
        "type": "address"
      }
    ],
    "name": "addManager",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "buyTicket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_subscriptionId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_vrfCoordinator",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "_keyHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "_callbackGasLimit",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "_nativePayment",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "_testMode",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "have",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "want",
        "type": "address"
      }
    ],
    "name": "OnlyCoordinatorCanFulfill",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "have",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "coordinator",
        "type": "address"
      }
    ],
    "name": "OnlyOwnerOrCoordinator",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "vrfCoordinator",
        "type": "address"
      }
    ],
    "name": "CoordinatorSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "requestId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "round",
        "type": "uint256"
      }
    ],
    "name": "DrawRequested",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_random",
        "type": "uint256"
      }
    ],
    "name": "drawWinner",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "PlatformFeeWithdrawn",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "requestId",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "randomWords",
        "type": "uint256[]"
      }
    ],
    "name": "rawFulfillRandomWords",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_addr",
        "type": "address"
      }
    ],
    "name": "removeManager",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestDraw",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_vrfCoordinator",
        "type": "address"
      }
    ],
    "name": "setCoordinator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "round",
        "type": "uint256"
      }
    ],
    "name": "TicketPurchased",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "prize",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "round",
        "type": "uint256"
      }
    ],
    "name": "WinnerSelected",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "withdrawFee",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  },
  {
    "inputs": [],
    "name": "curRound",
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
    "name": "feeRate",
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
    "name": "getPlatformBalance",
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
    "name": "getPlayers",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPlayersCount",
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
    "name": "getRound",
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
    "name": "getRoundFee",
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
    "name": "getTicketPrice",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isManager",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isPaused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "managersCnt",
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
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "pendingDraws",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformBalance",
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
    "name": "platformFeeReceiver",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "roundFee",
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
    "name": "roundSales",
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
    "name": "s_lastRequestId",
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
    "name": "s_vrfCoordinator",
    "outputs": [
      {
        "internalType": "contract IVRFCoordinatorV2Plus",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "testMode",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ticketPrice",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tickets",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

const account = ref('')
const network = ref('')
const isManager = ref(false)
const isPaused = ref(false)
const testMode = ref(false)
const round = ref(0)
const playersCount = ref(0)
const prizePool = ref(0n)
const ticketPrice = ref(0n)
const platformBalance = ref(0n)
const roundFee = ref(0n)
const logs = reactive([])

let provider = null
let signer = null
let contract = null

function addLog(type, msg) {
  logs.unshift({ type, msg, time: new Date().toLocaleTimeString() })
  if (logs.length > 50) logs.pop()
}

async function connectWallet() {
  if (!window.ethereum) throw new Error('请安装 MetaMask')
  provider = new ethers.BrowserProvider(window.ethereum)
  const accounts = await provider.send('eth_requestAccounts', [])
  account.value = accounts[0]
  signer = await provider.getSigner()
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)

  const net = await provider.getNetwork()
  network.value = net.chainId === 11155111n ? 'Sepolia'
    : net.chainId === 1n ? 'Ethereum'
    : net.chainId === 31337n ? 'Localhost'
    : 'Chain ' + net.chainId

  setupEvents()
  await refreshState()
}

function setupEvents() {
  contract.on('TicketPurchased', (buyer, r) => {
    addLog('buy', `[Round ${r}] ${buyer.slice(0, 6)}...${buyer.slice(-4)} 购票`)
    refreshState()
  })
  contract.on('DrawRequested', (requestId, r) => {
    addLog('draw', `[Round ${r}] VRF 请求 ID: ${requestId}`)
  })
  contract.on('WinnerSelected', (winner, prize, r) => {
    addLog('win', `[Round ${r}] 中奖者: ${winner.slice(0, 6)}...${winner.slice(-4)} | 奖金: ${ethers.formatEther(prize)} ETH`)
    refreshState()
  })
  contract.on('PlatformFeeWithdrawn', (amount) => {
    addLog('win', `平台费提取: ${ethers.formatEther(amount)} ETH`)
    refreshState()
  })
}

async function refreshState() {
  if (!contract) return
  const c = contract
  const results = await Promise.all([
    c.getRound(), c.getPlayersCount(), c.getBalance(),
    c.getTicketPrice().catch(() => 0n), c.isPaused(), c.testMode(),
    c.isManager(account.value)
  ])
  round.value = Number(results[0])
  playersCount.value = Number(results[1])
  prizePool.value = results[2]
  ticketPrice.value = results[3]
  isPaused.value = results[4]
  testMode.value = results[5]
  isManager.value = results[6]

  if (isManager.value) {
    const [pb, rf] = await Promise.all([c.getPlatformBalance(), c.getRoundFee()])
    platformBalance.value = pb
    roundFee.value = rf
  }
}

async function buyTicket() {
  const price = await contract.getTicketPrice()
  const tx = await contract.buyTicket({ value: price })
  addLog('buy', '交易已发送: ' + tx.hash.slice(0, 10) + '...')
  await tx.wait()
  addLog('buy', '购买成功!')
  await refreshState()
}

async function requestDraw() {
  const tx = await contract.requestDraw()
  addLog('draw', 'VRF 请求已发送: ' + tx.hash.slice(0, 10) + '...')
  await tx.wait()
  addLog('draw', '等待 Chainlink 回调...')
}

async function drawWinner(randomVal) {
  const tx = await contract.drawWinner(BigInt(randomVal))
  addLog('draw', '交易已发送: ' + tx.hash.slice(0, 10) + '...')
  await tx.wait()
  addLog('draw', '开奖完成!')
  await refreshState()
}

async function withdrawFee() {
  const tx = await contract.withdrawFee()
  await tx.wait()
  addLog('win', '平台费已提取')
  await refreshState()
}

async function togglePause() {
  const tx = isPaused.value ? await contract.unpause() : await contract.pause()
  await tx.wait()
  addLog('draw', isPaused.value ? '已恢复' : '已暂停')
  await refreshState()
}

async function addManager(addr) {
  const tx = await contract.addManager(addr)
  await tx.wait()
  addLog('draw', '已添加管理员: ' + addr.slice(0, 6) + '...')
}

async function removeManager(addr) {
  const tx = await contract.removeManager(addr)
  await tx.wait()
  addLog('draw', '已移除管理员: ' + addr.slice(0, 6) + '...')
}

onMounted(async () => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) await connectWallet()
    } catch (_) {}
  }
  window.ethereum?.on('accountsChanged', () => connectWallet())
  window.ethereum?.on('chainChanged', () => connectWallet())
})

export function useContract() {
  return {
    account, network, isManager, isPaused, testMode,
    round, playersCount, prizePool, ticketPrice, platformBalance, roundFee,
    logs,
    connectWallet, refreshState,
    buyTicket, requestDraw, drawWinner, withdrawFee, togglePause,
    addManager, removeManager
  }
}