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
  let attacker: Wallet;
  let fuseMarginController: FuseMarginController;
  let position: Position;
  let fuseMarginV1: FuseMarginV1;
  let impersonateAddressSigner: Signer;
  let DAI: ERC20;
  let WBTC: ERC20;
  let uniswapPairDAI: IUniswapV2Pair;
  let uniswapPairWBTC: IUniswapV2Pair;
  let fr4WBTC: CErc20Interface;
  let fr4DAI: CErc20Interface;
  const wbtcProvidedAmount: BigNumber = BigNumber.from("50000000");
  const daiBorrowAmount: BigNumber = BigNumber.from("3000000000000000000000");
  const wbtcBorrowAmount: BigNumber = BigNumber.from("5341854");
  const quoteTo: string = "0xdef1c0ded9bec7f1a1670819833240f027b25eff";

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    owner = <Wallet>accounts[0];
    attacker = <Wallet>accounts[1];

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

    DAI = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", daiAddress)) as ERC20;
    WBTC = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", wbtcAddress)) as ERC20;
    uniswapPairDAI = (await ethers.getContractAt(
      "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair",
      daiUNIV2Address,
    )) as IUniswapV2Pair;
    uniswapPairWBTC = (await ethers.getContractAt(
      "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair",
      wbtcUNIV2Address,
    )) as IUniswapV2Pair;
    fr4WBTC = (await ethers.getContractAt(
      "contracts/interfaces/CErc20Interface.sol:CErc20Interface",
      fr4WBTCAddress,
    )) as CErc20Interface;
    fr4DAI = (await ethers.getContractAt(
      "contracts/interfaces/CErc20Interface.sol:CErc20Interface",
      fr4DAIAddress,
    )) as CErc20Interface;

    impersonateAddressSigner = await ethers.provider.getSigner(impersonateAddress);
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAddress],
    });
  });

  afterEach(async () => {
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAddress],
    });
  });

  it("constructor should initialize state variables", async () => {
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
    const getPositionImplementation: string = await fuseMarginV1.positionImplementation();
    expect(getPositionImplementation).to.equal(position.address);
  });

  it("should revert if not controller owner", async () => {
    await expect(
      fuseMarginV1
        .connect(attacker)
        .transferToken(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("FuseMarginV1: Not owner of controller");
  });

  it("should revert if not uniswap pair", async () => {
    const data: string = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "address", "address", "address[7]", "bytes"],
      [
        BigNumber.from(0),
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        [wbtcAddress, daiAddress, wethAddress, fusePool4, fr4WBTCAddress, fr4DAIAddress, quoteTo],
        "0x",
      ],
    );
    await expect(
      fuseMarginV1.connect(attacker).uniswapV2Call(owner.address, BigNumber.from(0), BigNumber.from(0), data),
    ).to.be.revertedWith("FuseMarginV1: Only this contract may initiate");
    await expect(
      fuseMarginV1.connect(attacker).uniswapV2Call(fuseMarginV1.address, BigNumber.from(0), BigNumber.from(0), data),
    ).to.be.revertedWith("FuseMarginV1: only permissioned UniswapV2 pair can call");
  });

  it("should transfer tokens", async () => {
    const ethDepositAmount = ethers.utils.parseEther("1");
    const daiBalance3 = await DAI.balanceOf(fuseMarginV1.address);
    expect(daiBalance3).to.equal(BigNumber.from(0));
    await DAI.connect(impersonateAddressSigner).transfer(fuseMarginV1.address, ethDepositAmount);
    const daiBalance4 = await DAI.balanceOf(fuseMarginV1.address);
    expect(daiBalance4).to.equal(ethDepositAmount);
    const ownerBalance4 = await DAI.balanceOf(owner.address);
    await fuseMarginV1.transferToken(DAI.address, owner.address, ethDepositAmount);
    const daiBalance5 = await DAI.balanceOf(fuseMarginV1.address);
    expect(daiBalance5).to.equal(BigNumber.from(0));
    const ownerBalance5 = await DAI.balanceOf(owner.address);
    expect(ownerBalance5.sub(ownerBalance4)).to.equal(ethDepositAmount);
  });

  it("should open position", async () => {
    // why the USDC/DAI Uniswap pair doesnt work: 0x itself routes through there
    // https://api.0x.org/swap/v1/quote?sellToken=0x6B175474E89094C44Da98b954EedeAC495271d0F&buyToken=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599&sellAmount=3000000000000000000000&excludedSources=Uniswap_V2&slippagePercentage=1
    const quoteData: string =
      "0xd9627aa400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000a2a15d09519be000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599869584cd00000000000000000000000010000000000000000000000000000000000000110000000000000000000000000000000000000000000000c5867cf578607cf7cd";
    let amount0Out: BigNumber = daiBorrowAmount;
    let amount1Out: BigNumber = BigNumber.from(0);
    let pairToken: string = await uniswapPairDAI.token1();
    if (DAI.address === pairToken) {
      amount0Out = BigNumber.from(0);
      amount1Out = daiBorrowAmount;
      pairToken = await uniswapPairDAI.token0();
    }
    const wbtcBalance0 = await WBTC.balanceOf(impersonateAddress);
    const getBalanceOf0 = await fuseMarginController.balanceOf(impersonateAddress);
    expect(getBalanceOf0).to.equal(BigNumber.from(0));
    const [getTokenIdsOfOwner0, getPositionsOfOwner0] = await fuseMarginController.tokensOfOwner(impersonateAddress);
    expect(getTokenIdsOfOwner0).to.deep.equal([]);
    expect(getPositionsOfOwner0).to.deep.equal([]);
    await WBTC.connect(impersonateAddressSigner).approve(fuseMarginV1.address, wbtcProvidedAmount);
    await expect(
      fuseMarginV1
        .connect(impersonateAddressSigner)
        .openPosition(
          wbtcProvidedAmount,
          amount0Out,
          amount1Out,
          uniswapPairDAI.address,
          [WBTC.address, DAI.address, pairToken, fusePool4, fr4WBTCAddress, fr4DAIAddress, quoteTo],
          quoteData,
        ),
    )
      .to.emit(fuseMarginController, "Transfer")
      .withArgs(ethers.constants.AddressZero, impersonateAddress, BigNumber.from(0));
    const getPositions1 = await fuseMarginController.positions(BigNumber.from(0));
    expect(getPositions1).to.not.equal(ethers.constants.AddressZero);
    const getBalanceOf1 = await fuseMarginController.balanceOf(impersonateAddress);
    expect(getBalanceOf1).to.equal(BigNumber.from(1));
    const getOwnerOf1 = await fuseMarginController.ownerOf(BigNumber.from(0));
    expect(getOwnerOf1).to.equal(impersonateAddress);
    const [getTokenIdsOfOwner1, getPositionsOfOwner1] = await fuseMarginController.tokensOfOwner(impersonateAddress);
    expect(getTokenIdsOfOwner1).to.deep.equal([BigNumber.from(0)]);
    expect(getPositionsOfOwner1).to.deep.equal([getPositions1]);
    const getfr4WBTCBalance1 = await fr4WBTC.balanceOfUnderlying(getPositions1);
    expect(getfr4WBTCBalance1).to.be.gt(wbtcProvidedAmount);
    const getfr4DAIBalance1 = await fr4DAI.borrowBalanceStored(getPositions1);
    expect(getfr4DAIBalance1).to.be.gt(daiBorrowAmount);
    const wbtcBalance1 = await WBTC.balanceOf(impersonateAddress);
    expect(wbtcBalance1).to.equal(wbtcBalance0.sub(wbtcProvidedAmount));
  });

  it("should add to position", async () => {
    // why the USDC/DAI Uniswap pair doesnt work: 0x itself routes through there
    // https://api.0x.org/swap/v1/quote?sellToken=0x6B175474E89094C44Da98b954EedeAC495271d0F&buyToken=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599&sellAmount=3000000000000000000000&excludedSources=Uniswap_V2&slippagePercentage=1
    const quoteData: string =
      "0xd9627aa400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000a2a15d09519be000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599869584cd00000000000000000000000010000000000000000000000000000000000000110000000000000000000000000000000000000000000000c5867cf578607cf7cd";
    let amount0Out: BigNumber = daiBorrowAmount;
    let amount1Out: BigNumber = BigNumber.from(0);
    let pairToken: string = await uniswapPairDAI.token1();
    if (DAI.address === pairToken) {
      amount0Out = BigNumber.from(0);
      amount1Out = daiBorrowAmount;
      pairToken = await uniswapPairDAI.token0();
    }
    const getBalanceOf0 = await fuseMarginController.balanceOf(impersonateAddress);
    expect(getBalanceOf0).to.equal(BigNumber.from(0));
    await WBTC.connect(impersonateAddressSigner).approve(fuseMarginV1.address, wbtcProvidedAmount);
    await expect(
      fuseMarginV1
        .connect(impersonateAddressSigner)
        .openPosition(
          wbtcProvidedAmount,
          amount0Out,
          amount1Out,
          uniswapPairDAI.address,
          [WBTC.address, DAI.address, pairToken, fusePool4, fr4WBTCAddress, fr4DAIAddress, quoteTo],
          quoteData,
        ),
    )
      .to.emit(fuseMarginController, "Transfer")
      .withArgs(ethers.constants.AddressZero, impersonateAddress, BigNumber.from(0));
    const getPositions1 = await fuseMarginController.positions(BigNumber.from(0));
    const getfr4WBTCBalance1 = await fr4WBTC.balanceOfUnderlying(getPositions1);
    const wbtcAddAmount: BigNumber = BigNumber.from("10000000");
    await WBTC.connect(impersonateAddressSigner).approve(fuseMarginV1.address, wbtcAddAmount);
    await expect(
      fuseMarginV1
        .connect(attacker)
        .addToPosition(BigNumber.from(0), wbtcAddAmount, false, WBTC.address, fr4WBTC.address, fusePool4, []),
    ).to.be.revertedWith("FuseMarginV1: Not owner of position");
    await fuseMarginV1
      .connect(impersonateAddressSigner)
      .addToPosition(BigNumber.from(0), wbtcAddAmount, false, WBTC.address, fr4WBTC.address, fusePool4, []);
    const getfr4WBTCBalance2 = await fr4WBTC.balanceOfUnderlying(getPositions1);
    expect(getfr4WBTCBalance2).to.be.gte(getfr4WBTCBalance1.add(wbtcAddAmount));
  });

  it("should reenter and add to position", async () => {
    // why the USDC/DAI Uniswap pair doesnt work: 0x itself routes through there
    // https://api.0x.org/swap/v1/quote?sellToken=0x6B175474E89094C44Da98b954EedeAC495271d0F&buyToken=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599&sellAmount=3000000000000000000000&excludedSources=Uniswap_V2&slippagePercentage=1
    const quoteData: string =
      "0xd9627aa400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000a2a15d09519be000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599869584cd00000000000000000000000010000000000000000000000000000000000000110000000000000000000000000000000000000000000000c5867cf578607cf7cd";
    let amount0Out: BigNumber = daiBorrowAmount;
    let amount1Out: BigNumber = BigNumber.from(0);
    let pairToken: string = await uniswapPairDAI.token1();
    if (DAI.address === pairToken) {
      amount0Out = BigNumber.from(0);
      amount1Out = daiBorrowAmount;
      pairToken = await uniswapPairDAI.token0();
    }
    const getBalanceOf0 = await fuseMarginController.balanceOf(impersonateAddress);
    expect(getBalanceOf0).to.equal(BigNumber.from(0));
    await WBTC.connect(impersonateAddressSigner).approve(fuseMarginV1.address, wbtcProvidedAmount);
    await expect(
      fuseMarginV1
        .connect(impersonateAddressSigner)
        .openPosition(
          wbtcProvidedAmount,
          amount0Out,
          amount1Out,
          uniswapPairDAI.address,
          [WBTC.address, DAI.address, pairToken, fusePool4, fr4WBTCAddress, fr4DAIAddress, quoteTo],
          quoteData,
        ),
    )
      .to.emit(fuseMarginController, "Transfer")
      .withArgs(ethers.constants.AddressZero, impersonateAddress, BigNumber.from(0));
    const getPositions1 = await fuseMarginController.positions(BigNumber.from(0));
    const getfr4WBTCBalance1 = await fr4WBTC.balanceOfUnderlying(getPositions1);
    const wbtcAddAmount: BigNumber = BigNumber.from("10000000");
    await WBTC.connect(impersonateAddressSigner).approve(fuseMarginV1.address, wbtcAddAmount);
    await expect(
      fuseMarginV1
        .connect(attacker)
        .addToPosition(BigNumber.from(0), wbtcAddAmount, true, WBTC.address, fr4WBTC.address, fusePool4, [
          fr4WBTC.address,
        ]),
    ).to.be.revertedWith("FuseMarginV1: Not owner of position");
    await fuseMarginV1
      .connect(impersonateAddressSigner)
      .addToPosition(BigNumber.from(0), wbtcAddAmount, true, WBTC.address, fr4WBTC.address, fusePool4, [
        fr4WBTC.address,
      ]);
    const getfr4WBTCBalance2 = await fr4WBTC.balanceOfUnderlying(getPositions1);
    expect(getfr4WBTCBalance2).to.be.gte(getfr4WBTCBalance1.add(wbtcAddAmount));
  });

  it("should withdraw from position", async () => {
    // why the USDC/DAI Uniswap pair doesnt work: 0x itself routes through there
    // https://api.0x.org/swap/v1/quote?sellToken=0x6B175474E89094C44Da98b954EedeAC495271d0F&buyToken=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599&sellAmount=3000000000000000000000&excludedSources=Uniswap_V2&slippagePercentage=1
    const quoteData: string =
      "0xd9627aa400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000a2a15d09519be000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599869584cd00000000000000000000000010000000000000000000000000000000000000110000000000000000000000000000000000000000000000c5867cf578607cf7cd";
    let amount0Out: BigNumber = daiBorrowAmount;
    let amount1Out: BigNumber = BigNumber.from(0);
    let pairToken: string = await uniswapPairDAI.token1();
    if (DAI.address === pairToken) {
      amount0Out = BigNumber.from(0);
      amount1Out = daiBorrowAmount;
      pairToken = await uniswapPairDAI.token0();
    }
    const getBalanceOf0 = await fuseMarginController.balanceOf(impersonateAddress);
    expect(getBalanceOf0).to.equal(BigNumber.from(0));
    await WBTC.connect(impersonateAddressSigner).approve(fuseMarginV1.address, wbtcProvidedAmount);
    await expect(
      fuseMarginV1
        .connect(impersonateAddressSigner)
        .openPosition(
          wbtcProvidedAmount,
          amount0Out,
          amount1Out,
          uniswapPairDAI.address,
          [WBTC.address, DAI.address, pairToken, fusePool4, fr4WBTCAddress, fr4DAIAddress, quoteTo],
          quoteData,
        ),
    )
      .to.emit(fuseMarginController, "Transfer")
      .withArgs(ethers.constants.AddressZero, impersonateAddress, BigNumber.from(0));
    const getPositions1 = await fuseMarginController.positions(BigNumber.from(0));
    const getfr4WBTCBalance1 = await fr4WBTC.balanceOfUnderlying(getPositions1);
    const wbtcWithdrawAmount: BigNumber = BigNumber.from("10000000");
    await expect(
      fuseMarginV1
        .connect(attacker)
        .withdrawFromPosition(BigNumber.from(0), wbtcWithdrawAmount, WBTC.address, fr4WBTC.address),
    ).to.be.revertedWith("FuseMarginV1: Not owner of position");
    await fuseMarginV1
      .connect(impersonateAddressSigner)
      .withdrawFromPosition(BigNumber.from(0), wbtcWithdrawAmount, WBTC.address, fr4WBTC.address);
    const getfr4WBTCBalance2 = await fr4WBTC.balanceOfUnderlying(getPositions1);
    expect(getfr4WBTCBalance2).to.be.gte(getfr4WBTCBalance1.sub(wbtcWithdrawAmount));
  });

  it("should close position", async () => {
    // https://api.0x.org/swap/v1/quote?sellToken=0x6B175474E89094C44Da98b954EedeAC495271d0F&buyToken=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599&sellAmount=3000000000000000000000&excludedSources=Uniswap_V2&slippagePercentage=1
    const quoteData0: string =
      "0xd9627aa400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000a2a15d09519be000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599869584cd00000000000000000000000010000000000000000000000000000000000000110000000000000000000000000000000000000000000000c5867cf578607cf7cd";
    let amount0Out0: BigNumber = daiBorrowAmount;
    let amount1Out0: BigNumber = BigNumber.from(0);
    let pairToken0: string = await uniswapPairDAI.token1();
    if (DAI.address === pairToken0) {
      amount0Out0 = BigNumber.from(0);
      amount1Out0 = daiBorrowAmount;
      pairToken0 = await uniswapPairDAI.token0();
    }
    const wbtcBalance0 = await WBTC.balanceOf(impersonateAddress);
    const getBalanceOf0 = await fuseMarginController.balanceOf(impersonateAddress);
    expect(getBalanceOf0).to.equal(BigNumber.from(0));
    await WBTC.connect(impersonateAddressSigner).approve(fuseMarginV1.address, wbtcProvidedAmount);
    await fuseMarginV1
      .connect(impersonateAddressSigner)
      .openPosition(
        wbtcProvidedAmount,
        amount0Out0,
        amount1Out0,
        uniswapPairDAI.address,
        [WBTC.address, DAI.address, pairToken0, fusePool4, fr4WBTCAddress, fr4DAIAddress, quoteTo],
        quoteData0,
      );
    const getPositions1 = await fuseMarginController.positions(BigNumber.from(0));
    expect(getPositions1).to.not.equal(ethers.constants.AddressZero);
    const getBalanceOf1 = await fuseMarginController.balanceOf(impersonateAddress);
    expect(getBalanceOf1).to.equal(BigNumber.from(1));
    const getOwnerOf1 = await fuseMarginController.ownerOf(BigNumber.from(0));
    expect(getOwnerOf1).to.equal(impersonateAddress);
    const getfr4WBTCBalance1 = await fr4WBTC.balanceOfUnderlying(getPositions1);
    expect(getfr4WBTCBalance1).to.be.gt(wbtcProvidedAmount);
    const getfr4DAIBalance1 = await fr4DAI.borrowBalanceStored(getPositions1);
    expect(getfr4DAIBalance1).to.be.gt(daiBorrowAmount);
    const wbtcBalance1 = await WBTC.balanceOf(impersonateAddress);
    expect(wbtcBalance1).to.equal(wbtcBalance0.sub(wbtcProvidedAmount));
    const daiBalance1 = await DAI.balanceOf(impersonateAddress);

    const quoteData1: string =
      "0xd9627aa40000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000051829e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f869584cd00000000000000000000000010000000000000000000000000000000000000110000000000000000000000000000000000000000000000b998aed513607d1520";
    let amount0Out1: BigNumber = wbtcBorrowAmount;
    let amount1Out1: BigNumber = BigNumber.from(0);
    let pairToken1: string = await uniswapPairWBTC.token1();
    if (WBTC.address === pairToken1) {
      amount0Out1 = BigNumber.from(0);
      amount1Out1 = wbtcBorrowAmount;
      pairToken1 = await uniswapPairWBTC.token0();
    }
    await expect(
      fuseMarginV1
        .connect(attacker)
        .closePosition(
          BigNumber.from(0),
          amount0Out1,
          amount1Out1,
          uniswapPairWBTC.address,
          [WBTC.address, DAI.address, pairToken1, fusePool4, fr4WBTCAddress, fr4DAIAddress, quoteTo],
          quoteData1,
        ),
    ).to.be.revertedWith("FuseMarginV1: Not owner of position");
    await expect(
      fuseMarginV1
        .connect(impersonateAddressSigner)
        .closePosition(
          BigNumber.from(0),
          amount0Out1,
          amount1Out1,
          uniswapPairWBTC.address,
          [WBTC.address, DAI.address, pairToken1, fusePool4, fr4WBTCAddress, fr4DAIAddress, quoteTo],
          quoteData1,
        ),
    )
      .to.emit(fuseMarginController, "Transfer")
      .withArgs(impersonateAddress, ethers.constants.AddressZero, BigNumber.from(0));
    const getPositions2 = await fuseMarginController.positions(BigNumber.from(0));
    expect(getPositions2).to.equal(getPositions1);
    const getBalanceOf2 = await fuseMarginController.balanceOf(impersonateAddress);
    expect(getBalanceOf2).to.equal(BigNumber.from(0));
    await expect(fuseMarginController.ownerOf(BigNumber.from(0))).to.be.revertedWith(
      "ERC721: owner query for nonexistent token",
    );
    const [getTokenIdsOfOwner2, getPositionsOfOwner2] = await fuseMarginController.tokensOfOwner(impersonateAddress);
    expect(getTokenIdsOfOwner2).to.deep.equal([]);
    expect(getPositionsOfOwner2).to.deep.equal([]);
    const getfr4WBTCBalance2 = await fr4WBTC.balanceOfUnderlying(getPositions1);
    expect(getfr4WBTCBalance2).to.equal(BigNumber.from(0));
    const getfr4DAIBalance2 = await fr4DAI.borrowBalanceStored(getPositions1);
    expect(getfr4DAIBalance2).to.equal(BigNumber.from(0));
    const wbtcBalance2 = await WBTC.balanceOf(impersonateAddress);
    expect(wbtcBalance2).to.be.gt(wbtcBalance1);
    const daiBalance2 = await DAI.balanceOf(impersonateAddress);
    expect(daiBalance2).to.be.gte(daiBalance1);
  });
});
