import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";
import fetch from "node-fetch";
import {
  FuseMarginController,
  FuseMarginV1,
  Position,
  ERC20,
  FuseMarginController__factory,
  FuseMarginV1__factory,
  Position__factory,
  IUniswapV2Pair,
} from "../typechain";
import { fuseMarginControllerName, fuseMarginControllerSymbol } from "../scripts/constants/constructors";
import {
  soloMarginAddress,
  uniswapFactoryAddress,
  daiAddress,
  wbtcAddress,
  impersonateAddress,
  fusePool4,
  fr4WBTCAddress,
  fr4DAIAddress,
  daiUNIV2Address,
  wethAddress,
} from "../scripts/constants/addresses";

describe("FuseMarginV1", () => {
  let accounts: Signer[];
  let owner: Wallet;
  // let attacker: Wallet;
  let fuseMarginController: FuseMarginController;
  let position: Position;
  let fuseMarginV1: FuseMarginV1;

  const wbtcProvidedAmount: BigNumber = BigNumber.from("50000000");
  const daiBorrowAmount: BigNumber = BigNumber.from("3000000000000000000000");

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    owner = <Wallet>accounts[0];
    // attacker = <Wallet>accounts[1];

    const fuseMarginControllerFactory: FuseMarginController__factory = (await ethers.getContractFactory(
      "contracts/FuseMarginController.sol:FuseMarginController",
      owner,
    )) as FuseMarginController__factory;
    fuseMarginController = await fuseMarginControllerFactory.deploy(
      fuseMarginControllerName,
      fuseMarginControllerSymbol,
    );

    const positionFactory: Position__factory = (await ethers.getContractFactory(
      "contracts/Position.sol:Position",
      owner,
    )) as Position__factory;
    position = await positionFactory.deploy();
    await position.initialize(fuseMarginController.address);
    const fuseMarginV1Factory: FuseMarginV1__factory = (await ethers.getContractFactory(
      "contracts/FuseMarginV1.sol:FuseMarginV1",
      owner,
    )) as FuseMarginV1__factory;
    fuseMarginV1 = await fuseMarginV1Factory.deploy(
      fuseMarginController.address,
      position.address,
      uniswapFactoryAddress,
      soloMarginAddress,
    );
    await fuseMarginController.addMarginContract(fuseMarginV1.address);
  });

  it("constructor should initialize state variables", async () => {
    const getName: string = await fuseMarginController.name();
    expect(getName).to.equal(fuseMarginControllerName);
    const getSymbol: string = await fuseMarginController.symbol();
    expect(getSymbol).to.equal(fuseMarginControllerSymbol);
    const getOwner: string = await fuseMarginController.owner();
    expect(getOwner).to.equal(owner.address);
    const getMarginContracts: string = await fuseMarginController.marginContracts(BigNumber.from(0));
    expect(getMarginContracts).to.equal(fuseMarginV1.address);
    const getGetMarginContracts: string[] = await fuseMarginController.getMarginContracts();
    expect(getGetMarginContracts).to.deep.equal([fuseMarginV1.address]);
    const getApprovedContracts: boolean = await fuseMarginController.approvedContracts(fuseMarginV1.address);
    expect(getApprovedContracts).to.equal(true);
    const [getTokensOfOwner, getPositionsOfOwner]: [BigNumber[], string[]] = await fuseMarginController.tokensOfOwner(
      owner.address,
    );
    expect(getTokensOfOwner).to.deep.equal([]);
    expect(getPositionsOfOwner).to.deep.equal([]);

    const fuseMarginController0: string = await position.fuseMarginController();
    expect(fuseMarginController0).to.equal(fuseMarginController.address);
    const getUniswapFactory: string = await fuseMarginV1.uniswapFactory();
    expect(getUniswapFactory).to.equal(uniswapFactoryAddress);
    const getSoloMargin: string = await fuseMarginV1.soloMargin();
    expect(getSoloMargin).to.equal(soloMarginAddress);
    const getFuseMarginController1: string = await fuseMarginV1.fuseMarginController();
    expect(getFuseMarginController1).to.equal(fuseMarginController.address);
    const getFuseMarginERC721: string = await fuseMarginV1.fuseMarginERC721();
    expect(getFuseMarginERC721).to.equal(fuseMarginController.address);
    const getPositionImplementation: string = await fuseMarginV1.positionImplementation();
    expect(getPositionImplementation).to.equal(position.address);
  });

  it("test 0x swap", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAddress],
    });
    const impersonateSigner: Signer = await ethers.provider.getSigner(impersonateAddress);
    const quoteTo = "0xdef1c0ded9bec7f1a1670819833240f027b25eff";
    // why the USDC/DAI Uniswap pair doesnt work: 0x itself routes through there
    const quoteData =
      "0xd9627aa400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000a2a15d09519be0000000000000000000000000000000000000000000000000000000000000004077d7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599869584cd000000000000000000000000100000000000000000000000000000000000001100000000000000000000000000000000000000000000006b7e6e86c26078bd19";
    const exchangeData = ethers.utils.defaultAbiCoder.encode(["address", "bytes"], [quoteTo, quoteData]);

    const fusePool = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address"],
      [fusePool4, fr4WBTCAddress, fr4DAIAddress],
    );

    const WBTC: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      wbtcAddress,
    )) as ERC20;
    await WBTC.connect(impersonateSigner).approve(fuseMarginV1.address, wbtcProvidedAmount);

    const uniswapPair = (await ethers.getContractAt(
      "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair",
      daiUNIV2Address,
    )) as IUniswapV2Pair;
    let amount0Out = daiBorrowAmount;
    let amount1Out = BigNumber.from(0);
    let pairToken = await uniswapPair.token1();
    if (daiAddress === pairToken) {
      amount0Out = BigNumber.from(0);
      amount1Out = daiBorrowAmount;
      pairToken = await uniswapPair.token0();
    }

    await fuseMarginV1
      .connect(impersonateSigner)
      .openPositionBaseUniswap(
        daiUNIV2Address,
        wbtcAddress,
        daiAddress,
        wethAddress,
        wbtcProvidedAmount,
        amount0Out,
        amount1Out,
        fusePool,
        exchangeData,
      );

    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAddress],
    });
  });
});
