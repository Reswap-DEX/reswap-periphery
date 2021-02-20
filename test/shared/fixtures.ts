import { Wallet, Contract } from 'ethers'
import { Web3Provider } from 'ethers/providers'
import { deployContract } from 'ethereum-waffle'

import { expandTo18Decimals } from './utilities'

import ReswapV2Factory from '@reswap/v2-core/build/ReswapV2Factory.json'
import IReswapV2Pair from '../../build/IReswapV2Pair.json'

import ERC20 from '../../build/ERC20.json'
import WETH9 from '../../build/WETH9.json'
import UniswapV1Exchange from '../../build/UniswapV1Exchange.json'
import UniswapV1Factory from '../../build/UniswapV1Factory.json'
import ReswapV2Router01 from '../../build/ReswapV2Router01.json'
import ReswapV2Router02 from '../../build/ReswapV2Router02.json'
import RouterEventEmitter from '../../build/RouterEventEmitter.json'

const overrides = {
  gasLimit: 9999999
}

interface V2Fixture {
  token0: Contract
  token1: Contract
  WFTM: Contract
  WFTMPartner: Contract
  factoryV1: Contract
  factoryV2: Contract
  router01: Contract
  router02: Contract
  routerEventEmitter: Contract
  router: Contract
  WFTMExchangeV1: Contract
  pair: Contract
  WFTMPair: Contract
}

export async function v2Fixture(provider: Web3Provider, [wallet]: Wallet[]): Promise<V2Fixture> {
  // deploy tokens
  const tokenA = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)])
  const tokenB = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)])
  const WFTM = await deployContract(wallet, WETH9)
  const WFTMPartner = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)])

  // deploy V1
  const factoryV1 = await deployContract(wallet, UniswapV1Factory, [])
  await factoryV1.initializeFactory((await deployContract(wallet, UniswapV1Exchange, [])).address)

  // deploy V2
  const factoryV2 = await deployContract(wallet, ReswapV2Factory, [])

  // deploy routers
  const router01 = await deployContract(wallet, ReswapV2Router01, [factoryV2.address, WFTM.address], overrides)
  const router02 = await deployContract(wallet, ReswapV2Router02, [factoryV2.address, WFTM.address], overrides)

  // event emitter for testing
  const routerEventEmitter = await deployContract(wallet, RouterEventEmitter, [])

  // initialize V1
  await factoryV1.createExchange(WFTMPartner.address, overrides)
  const WFTMExchangeV1Address = await factoryV1.getExchange(WFTMPartner.address)
  const WFTMExchangeV1 = new Contract(WFTMExchangeV1Address, JSON.stringify(UniswapV1Exchange.abi), provider).connect(
    wallet
  )

  // initialize V2
  await factoryV2.createPair(tokenA.address, tokenB.address)
  const pairAddress = await factoryV2.getPair(tokenA.address, tokenB.address)
  const pair = new Contract(pairAddress, JSON.stringify(IReswapV2Pair.abi), provider).connect(wallet)

  const token0Address = await pair.token0()
  const token0 = tokenA.address === token0Address ? tokenA : tokenB
  const token1 = tokenA.address === token0Address ? tokenB : tokenA

  await factoryV2.createPair(WFTM.address, WFTMPartner.address)
  const WFTMPairAddress = await factoryV2.getPair(WFTM.address, WFTMPartner.address)
  const WFTMPair = new Contract(WFTMPairAddress, JSON.stringify(IReswapV2Pair.abi), provider).connect(wallet)

  return {
    token0,
    token1,
    WFTM,
    WFTMPartner,
    factoryV1,
    factoryV2,
    router01,
    router02,
    router: router02, // the default router, 01 had a minor bug
    routerEventEmitter,
    WFTMExchangeV1,
    pair,
    WFTMPair
  }
}
