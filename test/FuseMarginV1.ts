import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";
import {
  FuseMarginController,
  FuseMarginV1,
  Position,
  ERC20,
  FuseMarginController__factory,
  FuseMarginV1__factory,
  Position__factory,
  CErc20Interface,
  IUniswapV2Pair,
} from "../typechain";
import { fuseMarginControllerName, fuseMarginControllerSymbol } from "../scripts/constants/constructors";
import {
  uniswapFactoryAddress,
  daiAddress,
  wbtcAddress,
  impersonateAddress,
  fusePool4,
  fr4WBTCAddress,
  wbtcUNIV2Address,
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
    const getFuseMarginController1: string = await fuseMarginV1.fuseMarginController();
    expect(getFuseMarginController1).to.equal(fuseMarginController.address);
    const getFuseMarginERC721: string = await fuseMarginV1.fuseMarginERC721();
    expect(getFuseMarginERC721).to.equal(fuseMarginController.address);
    const getPositionImplementation: string = await fuseMarginV1.positionImplementation();
    expect(getPositionImplementation).to.equal(position.address);
  });

  it("should open and close position", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAddress],
    });
    const impersonateSigner: Signer = await ethers.provider.getSigner(impersonateAddress);
    const quoteTo = "0xdef1c0ded9bec7f1a1670819833240f027b25eff";
    // why the USDC/DAI Uniswap pair doesnt work: 0x itself routes through there
    const quoteData =
      "0xd9627aa400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000a2a15d09519be000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599869584cd00000000000000000000000010000000000000000000000000000000000000110000000000000000000000000000000000000000000000c5867cf578607cf7cd";
    const exchangeData = ethers.utils.defaultAbiCoder.encode(["address", "bytes"], [quoteTo, quoteData]);
    // https://api.0x.org/swap/v1/quote?sellToken=0x6B175474E89094C44Da98b954EedeAC495271d0F&buyToken=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599&sellAmount=3000000000000000000000&excludedSources=Uniswap_V2&slippagePercentage=1
    const fusePool = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address"],
      [fusePool4, fr4WBTCAddress, fr4DAIAddress],
    );

    const DAI: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      daiAddress,
    )) as ERC20;

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

    console.log("WBTC Balance:", (await WBTC.balanceOf(impersonateAddress)).toString());
    console.log("DAI Balance:", (await DAI.balanceOf(impersonateAddress)).toString());

    await fuseMarginV1
      .connect(impersonateSigner)
      .openPosition(
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

    const fr4WBTC = (await ethers.getContractAt(
      "contracts/interfaces/CErc20Interface.sol:CErc20Interface",
      fr4WBTCAddress,
    )) as CErc20Interface;
    const fr4WBTCToken = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      fr4WBTCAddress,
    )) as ERC20;
    const fr4DAI = (await ethers.getContractAt(
      "contracts/interfaces/CErc20Interface.sol:CErc20Interface",
      fr4DAIAddress,
    )) as CErc20Interface;
    const fr4DAIToken = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      fr4DAIAddress,
    )) as ERC20;
    const tokens = await fuseMarginController.tokensOfOwner(impersonateAddress);
    console.log(
      ethers.utils.formatUnits(await fr4WBTC.balanceOfUnderlying(tokens[1][0]), 8),
      (await fr4WBTC.balanceOfUnderlying(tokens[1][0])).toString(),
    );
    console.log(
      ethers.utils.formatUnits(await fr4DAI.borrowBalanceStored(tokens[1][0]), 18),
      (await fr4DAI.borrowBalanceStored(tokens[1][0])).toString(),
    );
    console.log("WBTC Balance:", (await WBTC.balanceOf(impersonateAddress)).toString());
    console.log("DAI Balance:", (await DAI.balanceOf(impersonateAddress)).toString());

    await fuseMarginV1
      .connect(impersonateSigner)
      .closePosition(
        wbtcUNIV2Address,
        wbtcAddress,
        daiAddress,
        wethAddress,
        BigNumber.from(0),
        BigNumber.from("5341854"),
        amount1Out,
        fusePool,
        ethers.utils.defaultAbiCoder.encode(
          ["address", "bytes"],
          [
            quoteTo,
            "0xd9627aa40000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000051829e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f869584cd00000000000000000000000010000000000000000000000000000000000000110000000000000000000000000000000000000000000000b998aed513607d1520",
          ],
        ),
      );
    console.log(
      ethers.utils.formatUnits(await fr4WBTC.balanceOfUnderlying(tokens[1][0]), 8),
      (await fr4WBTC.balanceOfUnderlying(tokens[1][0])).toString(),
    );
    console.log(
      ethers.utils.formatUnits(await fr4DAI.borrowBalanceStored(tokens[1][0]), 18),
      (await fr4DAI.borrowBalanceStored(tokens[1][0])).toString(),
    );
    console.log("WBTC Balance:", (await WBTC.balanceOf(impersonateAddress)).toString());
    console.log("DAI Balance:", (await DAI.balanceOf(impersonateAddress)).toString());

    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAddress],
    });
  });
});
