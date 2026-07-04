import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ethers } from 'ethers'

const CONTRACT_ADDRESS = '0x_YOUR_DEPLOYED_ADDRESS_HERE'

const ABI = [
  'function isManager(address) view returns (bool)',
  'function platformFeeReceiver() view returns (address)',
  'function platformBalance() view returns (uint256)',
  'function roundFee() view returns (uint256)',
  'function feeRate() view returns (uint256)',
  'function roundSales() view returns (uint256)',
  'function curRound() view returns (uint256)',
  'function paused() view returns (bool)',
  'function ticketPrice() view returns (uint256)',
  'function testMode() view returns (bool)',
  'function s_lastRequestId() view returns (uint256)',
  'function pendingDraws(uint256) view returns (bool)',
  'function getPlayersCount() view returns (uint256)',
  'function getRound() view returns (uint256)',
  'function getBalance() view returns (uint256)',
  'function getRoundFee() view returns (uint256)',
  'function getPlatformBalance() view returns (uint256)',
  'function getTicketPrice() view returns (uint256)',
  'function getPlayers() view returns (address[])',
  'function isPaused() view returns (bool)',
  'function buyTicket() payable',
  'function requestDraw()',
  'function drawWinner(uint256)',
  'function withdrawFee()',
  'function pause()',
  'function unpause()',
  'function addManager(address)',
  'function removeManager(address)',
  'event TicketPurchased(address indexed buyer, uint256 round)',
  'event DrawRequested(uint256 indexed requestId, uint256 round)',
  'event WinnerSelected(address indexed winner, uint256 prize, uint256 round)',
  'event PlatformFeeWithdrawn(uint256 amount)'
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