// src/composables/useLottery.js
// ✅ 适用于 ethers v5.7.2

// ============ 导入依赖 ============
import { ethers } from "ethers"; // 以太坊交互核心库
import { ref, shallowRef } from "vue"; // ref: 响应式数据, shallowRef: 浅响应式（不代理内部属性）
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../config/contract.js"; // 合约配置（地址 + ABI）

// ============ 定义 composable ============
export function useLottery() {
  // ============ 状态变量 ============
  // ✅ 使用 shallowRef 替代 ref，避免 Vue 代理破坏 ethers 内部属性（如 _network）
  const contract = shallowRef(null); // 合约实例（调用合约函数的入口）
  const signer = shallowRef(null); // 签名者（代表当前用户，用于发起交易）
  const provider = shallowRef(null); // 提供者（连接区块链的节点，用于查询数据）
  const loading = ref(false); // 加载状态（用于按钮禁用/显示加载中）

  // ============ 初始化函数 ============
  const init = async () => {
    // 检查浏览器是否安装了 MetaMask
    if (!window.ethereum) {
      alert("请安装 MetaMask");
      return;
    }

    // 1. 创建 Provider（连接以太坊网络）
    //    Web3Provider 是 ethers v5 中连接浏览器钱包的入口
    provider.value = new ethers.providers.Web3Provider(window.ethereum);

    // 2. 获取 Signer（签名者/当前用户）
    //    不需要 await，v5 中 getSigner() 是同步的
    signer.value = provider.value.getSigner();

    // 3. 创建 Contract 实例（连接合约）
    //    参数：合约地址、ABI（接口说明）、签名者
    contract.value = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer.value,
    );

    console.log("✅ 合约初始化成功，地址:", CONTRACT_ADDRESS);
  };

  // ============ 获取当前钱包地址 ============
  const getCurrentAddress = async () => {
    if (!signer.value) return "";
    return await signer.value.getAddress(); // 从签名者中读取地址
  };

  // ============ 链上查询函数（只读，不消耗 Gas） ============

  // 获取当前奖池金额（不含平台费）
  const getBalance = async () => {
    if (!contract.value) return "0";
    try {
      const balance = await contract.value.getBalance(); // 调用合约的 getBalance()
      return ethers.utils.formatEther(balance); // wei → ETH 字符串
    } catch (error) {
      console.error("getBalance 失败:", error);
      return "0";
    }
  };

  // 获取平台累积手续费
  const getPlatformBalance = async () => {
    if (!contract.value) return "0";
    try {
      const balance = await contract.value.getPlatformBalance();
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error("getPlatformBalance 失败:", error);
      return "0";
    }
  };

  // 获取合约总余额（奖池 + 平台费）
  const getTotalBalance = async () => {
    if (!contract.value) return "0";
    try {
      const balance = await contract.value.getBalance();
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error("getTotalBalance 失败:", error);
      return "0";
    }
  };

  // 获取当前期参与人数
  const getPlayersCount = async () => {
    if (!contract.value) return 0;
    try {
      const count = await contract.value.getPlayersCount();
      return Number(count); // BigNumber → 普通数字
    } catch (error) {
      console.error("getPlayersCount 失败:", error);
      return 0;
    }
  };

  // 获取当前期所有玩家地址列表
  const getPlayers = async () => {
    if (!contract.value) return [];
    try {
      return await contract.value.getPlayers(); // 返回地址数组
    } catch (error) {
      console.error("getPlayers 失败:", error);
      return [];
    }
  };

  // 获取当前期数
  const getRound = async () => {
    if (!contract.value) return 0;
    try {
      const round = await contract.value.round(); // 调用合约的 round() 公共变量
      return Number(round);
    } catch (error) {
      console.error("getRound 失败:", error);
      return 0;
    }
  };

  // ============ 链上写入函数（消耗 Gas，需要用户签名） ============

  // 买票
  const buyTicket = async () => {
    if (!contract.value) return;

    loading.value = true; // 开启加载状态（禁用按钮，防止重复点击）
    try {
      // 1. 调用合约的 buyTicket 函数，附带 0.001 ETH
      //    parseEther 把 "0.001" ETH 转换成 wei 单位
      const tx = await contract.value.buyTicket({
        value: ethers.utils.parseEther("0.001"),
      });

      // 2. 等待交易被区块链确认（打包进区块）
      //    tx.wait() 返回交易收据，包含交易哈希、Gas 消耗等
      const receipt = await tx.wait();
      return receipt; // 返回交易收据，供调用方使用
    } catch (error) {
      console.error("buyTicket 失败:", error);
      throw error; // 向上抛出错误，让组件处理（如弹窗提示）
    } finally {
      loading.value = false; // 无论成功还是失败，都关闭加载状态
    }
  };

  // 管理员开奖（调用合约的 drawWinner）
  const drawWinner = async (winnerIndex) => {
    if (!contract.value) return;
    try {
      // 调用合约的 drawWinner 函数，传入中奖者索引
      const tx = await contract.value.drawWinner(winnerIndex);
      return await tx.wait(); // 等待确认并返回收据
    } catch (error) {
      console.error("drawWinner 失败:", error);
      throw error;
    }
  };
  // ============ 管理员提取平台手续费 ============
  const withdrawFee = async () => {
    if (!contract.value) return;
    try {
      const tx = await contract.value.withdrawFee();
      return await tx.wait();
    } catch (error) {
      console.error("withdrawFee 失败:", error);
      throw error;
    }
  };

  // ============ 导出所有函数和状态 ============
  return {
    init, // 初始化连接
    contract, // 合约实例（供组件读取管理员地址等）
    buyTicket, // 买票
    drawWinner, // 开奖（管理员）
    withdrawFee, //提取手续费
    getBalance, // 查询奖池
    getPlatformBalance, // 查询平台费
    getTotalBalance, // 查询合约总余额
    getPlayersCount, // 查询参与人数
    getPlayers, // 查询玩家列表
    getRound, // 查询当前期数
    loading, // 加载状态
    getCurrentAddress, // 获取当前钱包地址
  };
}
