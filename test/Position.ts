import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";
import {
  FuseMarginController,
  Position,
  FuseMarginController__factory,
  CEtherInterface,
  Position__factory,
  IERC20,
  ERC20,
  CErc20Interface,
  ComptrollerInterface,
  IWETH9,
} from "../typechain";
import { fuseMarginControllerName, fuseMarginControllerSymbol } from "../scripts/constants/constructors";
import {
  usdcAddress,
  impersonateAddress,
  wethAddress,
  daiAddress,
  fusePool4,
  fr4USDCAddress,
  fr4DAIAddress,
  fr4ETHAddress,
} from "../scripts/constants/addresses";

describe("Position", () => {
  let accounts: Signer[];
  let owner: Wallet;
  let attacker: Wallet;
  let position: Position;
  let fuseMarginController: FuseMarginController;
  let impersonateAddressSigner: Signer;
  let DAI: ERC20;
  let USDC: ERC20;
  let WETH9: IWETH9;
  let fr4DAI: CErc20Interface;
  let fr4USDC: CErc20Interface;
  let fr4ETH: CEtherInterface;
  let FusePool4: ComptrollerInterface;

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
    await fuseMarginController.addMarginContract(attacker.address);

    WETH9 = (await ethers.getContractAt("contracts/interfaces/IWETH9.sol:IWETH9", wethAddress)) as IWETH9;
    DAI = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", daiAddress)) as ERC20;
    USDC = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", usdcAddress)) as ERC20;
    fr4DAI = (await ethers.getContractAt(
      "contracts/interfaces/CErc20Interface.sol:CErc20Interface",
      fr4DAIAddress,
    )) as CErc20Interface;
    fr4USDC = (await ethers.getContractAt(
      "contracts/interfaces/CErc20Interface.sol:CErc20Interface",
      fr4USDCAddress,
    )) as CErc20Interface;
    fr4ETH = (await ethers.getContractAt(
      "contracts/interfaces/CEtherInterface.sol:CEtherInterface",
      fr4ETHAddress,
    )) as CEtherInterface;
    FusePool4 = (await ethers.getContractAt(
      "contracts/interfaces/ComptrollerInterface.sol:ComptrollerInterface",
      fusePool4,
    )) as ComptrollerInterface;

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

  it("should initialize", async () => {
    const getName: string = await fuseMarginController.name();
    expect(getName).to.equal(fuseMarginControllerName);
    const getSymbol: string = await fuseMarginController.symbol();
    expect(getSymbol).to.equal(fuseMarginControllerSymbol);
    const getOwner: string = await fuseMarginController.owner();
    expect(getOwner).to.equal(owner.address);
    const getMarginContracts: string = await fuseMarginController.marginContracts(BigNumber.from(0));
    expect(getMarginContracts).to.equal(attacker.address);
    const getGetMarginContracts: string[] = await fuseMarginController.getMarginContracts();
    expect(getGetMarginContracts).to.deep.equal([attacker.address]);
    const getApprovedContracts: boolean = await fuseMarginController.approvedContracts(attacker.address);
    expect(getApprovedContracts).to.equal(true);
    const [getTokensOfOwner, getPositionsOfOwner]: [BigNumber[], string[]] = await fuseMarginController.tokensOfOwner(
      owner.address,
    );
    expect(getTokensOfOwner).to.deep.equal([]);
    expect(getPositionsOfOwner).to.deep.equal([]);

    const getFuseMarginController0: string = await position.fuseMarginController();
    expect(getFuseMarginController0).to.equal(fuseMarginController.address);
    await expect(position.initialize(attacker.address)).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
  });

  it("should revert if not margin contract", async () => {
    await expect(position.proxyCall(ethers.constants.AddressZero, "0x")).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.transferToken(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.transferETH(ethers.constants.AddressZero, BigNumber.from(0))).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.mint(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.mintETH(ethers.constants.AddressZero, { value: BigNumber.from(0) })).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(position.enterMarkets(ethers.constants.AddressZero, [])).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(position.exitMarket(ethers.constants.AddressZero, ethers.constants.AddressZero)).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.borrow(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.borrowETH(ethers.constants.AddressZero, BigNumber.from(0))).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.repayBorrow(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.repayBorrowETH(ethers.constants.AddressZero)).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.redeem(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.redeemETH(ethers.constants.AddressZero, BigNumber.from(0))).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.redeemUnderlying(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.redeemUnderlyingETH(ethers.constants.AddressZero, BigNumber.from(0))).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.mintAndBorrow(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.mintETHAndBorrow(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.mintAndBorrowETH(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.repayAndRedeem(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.repayETHAndRedeem(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.repayAndRedeemETH(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
  });

  it("should perform proxy call", async () => {
    const wethBalance0 = await WETH9.balanceOf(position.address);
    expect(wethBalance0).to.equal(BigNumber.from(0));
    const wethDepositCall: string = WETH9.interface.encodeFunctionData("deposit");
    const wethDepositAmount = ethers.utils.parseEther("1");
    await position.connect(attacker).proxyCall(WETH9.address, wethDepositCall, { value: wethDepositAmount });
    const wethBalance1 = await WETH9.balanceOf(position.address);
    expect(wethBalance1).to.equal(wethDepositAmount);

    const wethWithdrawCall: string = WETH9.interface.encodeFunctionData("withdraw", [wethDepositAmount]);
    const ethBalance2 = await ethers.provider.getBalance(position.address);
    expect(ethBalance2).to.equal(BigNumber.from(0));
    await position.connect(attacker).proxyCall(WETH9.address, wethWithdrawCall);
    const wethBalance3 = await WETH9.balanceOf(position.address);
    expect(wethBalance3).to.equal(BigNumber.from(0));
    const ethBalance3 = await ethers.provider.getBalance(position.address);
    expect(ethBalance3).to.equal(wethDepositAmount);
  });

  it("should approve tokens", async () => {
    const daiApproval0 = await DAI.allowance(position.address, owner.address);
    expect(daiApproval0).to.equal(BigNumber.from(0));
    const ethDepositAmount = ethers.utils.parseEther("1");
    await position.connect(attacker).approveToken(DAI.address, owner.address, ethDepositAmount);
    const daiApproval1 = await DAI.allowance(position.address, owner.address);
    expect(daiApproval1).to.equal(ethDepositAmount);
  });

  it("should transfer ETH and tokens", async () => {
    const ethBalance0 = await ethers.provider.getBalance(position.address);
    expect(ethBalance0).to.equal(BigNumber.from(0));
    const ethDepositAmount = ethers.utils.parseEther("1");
    await owner.sendTransaction({ to: position.address, value: ethDepositAmount });
    const ethBalance1 = await ethers.provider.getBalance(position.address);
    expect(ethBalance1).to.equal(ethDepositAmount);
    await position.connect(attacker).transferETH(owner.address, ethDepositAmount);
    const ethBalance2 = await ethers.provider.getBalance(position.address);
    expect(ethBalance2).to.equal(BigNumber.from(0));

    const daiBalance3 = await DAI.balanceOf(position.address);
    expect(daiBalance3).to.equal(BigNumber.from(0));
    await DAI.connect(impersonateAddressSigner).transfer(position.address, ethDepositAmount);
    const daiBalance4 = await DAI.balanceOf(position.address);
    expect(daiBalance4).to.equal(ethDepositAmount);
    await position.connect(attacker).transferToken(DAI.address, owner.address, ethDepositAmount);
    const daiBalance5 = await DAI.balanceOf(position.address);
    expect(daiBalance5).to.equal(BigNumber.from(0));
    const ownerBalance5 = await DAI.balanceOf(owner.address);
    expect(ownerBalance5).to.equal(ethDepositAmount);
  });

  it("should mint ERC20s and ETH", async () => {
    const fr4USDCToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      fr4USDC.address,
    )) as IERC20;
    const fr4USDCBalance0 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCBalance0).to.equal(BigNumber.from(0));
    const fr4USDCTokenBalance0 = await fr4USDCToken.balanceOf(position.address);
    expect(fr4USDCTokenBalance0).to.equal(BigNumber.from(0));
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    const usdcBalance0 = await USDC.balanceOf(position.address);
    expect(usdcBalance0).to.equal(mintAmountUSDC);
    await position.connect(attacker).mint(USDC.address, fr4USDC.address, mintAmountUSDC);
    const fr4USDCBalance1 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCBalance1).to.be.gt(fr4USDCBalance0);
    const fr4USDCTokenBalance1 = await fr4USDCToken.balanceOf(position.address);
    expect(fr4USDCTokenBalance1).to.be.gt(fr4USDCTokenBalance0);
    const usdcBalance1 = await USDC.balanceOf(position.address);
    expect(usdcBalance1).to.equal(BigNumber.from(0));

    const fr4ETHToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      fr4ETH.address,
    )) as IERC20;
    const fr4ETHBalance2 = await fr4ETH.balanceOfUnderlying(position.address);
    expect(fr4ETHBalance2).to.equal(BigNumber.from(0));
    const fr4ETHTokenBalance2 = await fr4ETHToken.balanceOf(position.address);
    expect(fr4ETHTokenBalance2).to.equal(BigNumber.from(0));
    const mintAmountETH = ethers.utils.parseEther("10");
    await position.connect(attacker).mintETH(fr4ETH.address, { value: mintAmountETH });
    const fr4ETHBalance3 = await fr4ETH.balanceOfUnderlying(position.address);
    expect(fr4ETHBalance3).to.gt(fr4ETHBalance2);
    const fr4ETHTokenBalance3 = await fr4ETHToken.balanceOf(position.address);
    expect(fr4ETHTokenBalance3).to.gt(fr4ETHTokenBalance2);
  });

  it("should enter markets", async () => {
    const comptrollerMarkets0 = await FusePool4.getAssetsIn(position.address);
    expect(comptrollerMarkets0).to.deep.equal([]);
    await position.connect(attacker).enterMarkets(FusePool4.address, [fr4USDC.address]);
    const comptrollerMarkets1 = await FusePool4.getAssetsIn(position.address);
    expect(comptrollerMarkets1).to.deep.equal([fr4USDC.address]);

    // Exiting markets already entered is not working
    // await position.connect(attacker).exitMarket(FusePool4.address, fr4USDC.address);
    // const comptrollerMarkets3 = await FusePool4.getAssetsIn(position.address);
    // expect(comptrollerMarkets3).to.deep.equal([]);
    // But exiting a new market works for some reason
    await position.connect(attacker).exitMarket(FusePool4.address, fr4DAI.address);
    const comptrollerMarkets3 = await FusePool4.getAssetsIn(position.address);
    expect(comptrollerMarkets3).to.deep.equal([fr4USDC.address]);
  });

  it("should borrow ERC20s and ETH", async () => {
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    await position.connect(attacker).mint(USDC.address, fr4USDC.address, mintAmountUSDC);
    await position.connect(attacker).enterMarkets(FusePool4.address, [fr4USDC.address]);

    const daiBalance2 = await DAI.balanceOf(attacker.address);
    expect(daiBalance2).to.equal(BigNumber.from(0));
    const fr4DAIBalance2 = await fr4DAI.borrowBalanceCurrent(position.address);
    expect(fr4DAIBalance2).to.equal(BigNumber.from(0));
    const borrowAmountDAI = ethers.utils.parseUnits("10000", await DAI.decimals());
    await position.connect(attacker).borrow(DAI.address, fr4DAI.address, borrowAmountDAI);
    const daiBalance3 = await DAI.balanceOf(attacker.address);
    expect(daiBalance3).to.equal(borrowAmountDAI);
    const fr4DAIBalance3 = await fr4DAI.borrowBalanceCurrent(position.address);
    expect(fr4DAIBalance3).to.equal(borrowAmountDAI);

    const ethBalance4 = await ethers.provider.getBalance(attacker.address);
    const frETHBalance4 = await fr4ETH.borrowBalanceCurrent(position.address);
    expect(frETHBalance4).to.equal(BigNumber.from(0));
    const borrowAmountETH = ethers.utils.parseEther("2");
    await position.connect(attacker).borrowETH(fr4ETH.address, borrowAmountETH);
    const ethBalance5 = await ethers.provider.getBalance(attacker.address);
    expect(ethBalance5).to.be.gt(ethBalance4);
    const frETHBalance5 = await fr4ETH.borrowBalanceCurrent(position.address);
    expect(frETHBalance5).to.equal(borrowAmountETH);
  });

  it("should repay borrow ERC20s and ETH", async () => {
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    await position.connect(attacker).mint(USDC.address, fr4USDC.address, mintAmountUSDC);
    await position.connect(attacker).enterMarkets(FusePool4.address, [fr4USDC.address]);
    const borrowAmountDAI = ethers.utils.parseUnits("10000", await DAI.decimals());
    await position.connect(attacker).borrow(DAI.address, fr4DAI.address, borrowAmountDAI);

    const daiBalance2 = await DAI.balanceOf(position.address);
    expect(daiBalance2).to.equal(BigNumber.from(0));
    await DAI.connect(impersonateAddressSigner).transfer(position.address, borrowAmountDAI);
    const daiBalance3 = await DAI.balanceOf(position.address);
    expect(daiBalance3).to.equal(borrowAmountDAI);
    const fr4DAIBalance3 = await fr4DAI.borrowBalanceCurrent(position.address);
    expect(fr4DAIBalance3).to.be.gte(borrowAmountDAI);
    await position.connect(attacker).repayBorrow(DAI.address, fr4DAI.address, borrowAmountDAI);
    const fr4DAIBalance4 = await fr4DAI.borrowBalanceCurrent(position.address);
    expect(fr4DAIBalance4).to.be.lt(borrowAmountDAI);

    const borrowAmountETH = ethers.utils.parseEther("2");
    await position.connect(attacker).borrowETH(fr4ETH.address, borrowAmountETH);
    const fr4ETHBalance5 = await fr4ETH.borrowBalanceCurrent(position.address);
    expect(fr4ETHBalance5).to.be.gte(borrowAmountETH);
    await position.connect(attacker).repayBorrowETH(fr4ETH.address, { value: borrowAmountETH });
    const fr4ETHBalance6 = await fr4ETH.borrowBalanceCurrent(position.address);
    expect(fr4ETHBalance6).to.be.lt(borrowAmountETH);
  });

  it("should redeem ERC20s and ETH", async () => {
    const fr4USDCToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      fr4USDC.address,
    )) as IERC20;
    const fr4USDCTokenBalance0 = await fr4USDCToken.balanceOf(position.address);
    expect(fr4USDCTokenBalance0).to.equal(BigNumber.from(0));
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    await position.connect(attacker).mint(USDC.address, fr4USDC.address, mintAmountUSDC);
    const fr4USDCTokenBalance1 = await fr4USDCToken.balanceOf(position.address);
    expect(fr4USDCTokenBalance1).to.be.gt(fr4USDCTokenBalance0);
    await position.connect(attacker).redeem(USDC.address, fr4USDC.address, fr4USDCTokenBalance1);
    const fr4USDCTokenBalance2 = await fr4USDCToken.balanceOf(position.address);
    expect(fr4USDCTokenBalance2).to.equal(BigNumber.from(0));
    const USDCBalance2 = await USDC.balanceOf(attacker.address);
    expect(USDCBalance2).to.be.gte(mintAmountUSDC);

    const fr4ETHToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      fr4ETH.address,
    )) as IERC20;
    const fr4ETHTokenBalance3 = await fr4ETHToken.balanceOf(position.address);
    expect(fr4ETHTokenBalance3).to.equal(BigNumber.from(0));
    const mintAmountETH = ethers.utils.parseEther("10");
    await position.connect(attacker).mintETH(fr4ETH.address, { value: mintAmountETH });
    const fr4ETHTokenBalance4 = await fr4ETHToken.balanceOf(position.address);
    expect(fr4ETHTokenBalance4).to.gt(fr4ETHTokenBalance3);
    const ethBalance4 = await ethers.provider.getBalance(attacker.address);
    await position.connect(attacker).redeemETH(fr4ETH.address, fr4ETHTokenBalance4);
    const fr4USDCTokenBalance5 = await fr4USDCToken.balanceOf(position.address);
    expect(fr4USDCTokenBalance5).to.equal(BigNumber.from(0));
    const ethBalance5 = await ethers.provider.getBalance(attacker.address);
    expect(ethBalance5).to.be.gt(ethBalance4);
  });

  it("should redeem underlying of ERC20s and ETH", async () => {
    const fr4USDCTokenBalance0 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance0).to.equal(BigNumber.from(0));
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    await position.connect(attacker).mint(USDC.address, fr4USDC.address, mintAmountUSDC);
    const fr4USDCTokenBalance1 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance1).to.be.gt(fr4USDCTokenBalance0);
    await position.connect(attacker).redeemUnderlying(USDC.address, fr4USDC.address, fr4USDCTokenBalance1);
    const fr4USDCTokenBalance2 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance2).to.be.lt(fr4USDCTokenBalance1);
    const USDCBalance2 = await USDC.balanceOf(attacker.address);
    expect(USDCBalance2).to.be.gte(fr4USDCTokenBalance1);

    const fr4ETHTokenBalance3 = await fr4ETH.balanceOfUnderlying(position.address);
    expect(fr4ETHTokenBalance3).to.equal(BigNumber.from(0));
    const mintAmountETH = ethers.utils.parseEther("10");
    await position.connect(attacker).mintETH(fr4ETH.address, { value: mintAmountETH });
    const fr4ETHTokenBalance4 = await fr4ETH.balanceOfUnderlying(position.address);
    expect(fr4ETHTokenBalance4).to.gt(fr4ETHTokenBalance3);
    const ethBalance4 = await ethers.provider.getBalance(attacker.address);
    await position.connect(attacker).redeemUnderlyingETH(fr4ETH.address, fr4ETHTokenBalance4);
    const fr4ETHTokenBalance5 = await fr4ETH.balanceOfUnderlying(position.address);
    expect(fr4ETHTokenBalance5).to.be.lt(fr4ETHTokenBalance4);
    const ethBalance5 = await ethers.provider.getBalance(attacker.address);
    expect(ethBalance5).to.be.gt(ethBalance4);
  });

  it("should mint and borrow", async () => {
    const fr4USDCTokenBalance0 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance0).to.equal(BigNumber.from(0));
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    const fr4DAIBalance0 = await fr4DAI.borrowBalanceCurrent(position.address);
    expect(fr4DAIBalance0).to.equal(BigNumber.from(0));
    const DAIBalance0 = await DAI.balanceOf(attacker.address);
    const borrowAmountDAI = ethers.utils.parseUnits("10000", await DAI.decimals());
    await position
      .connect(attacker)
      .mintAndBorrow(
        FusePool4.address,
        USDC.address,
        fr4USDC.address,
        DAI.address,
        fr4DAI.address,
        mintAmountUSDC,
        borrowAmountDAI,
      );
    const fr4USDCTokenBalance1 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance1).to.be.gt(fr4USDCTokenBalance0);
    const fr4DAIBalance1 = await fr4DAI.borrowBalanceCurrent(position.address);
    expect(fr4DAIBalance1).to.equal(borrowAmountDAI);
    const DAIBalance1 = await DAI.balanceOf(attacker.address);
    expect(DAIBalance1).to.equal(DAIBalance0.add(borrowAmountDAI));

    const fr4USDCTokenBalance2 = await fr4USDC.balanceOfUnderlying(position.address);
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    const fr4ETHBalance2 = await fr4ETH.borrowBalanceCurrent(position.address);
    expect(fr4ETHBalance2).to.equal(BigNumber.from(0));
    const ethBalance2 = await ethers.provider.getBalance(attacker.address);
    const borrowAmountETH = ethers.utils.parseEther("2");
    await position
      .connect(attacker)
      .mintAndBorrowETH(
        FusePool4.address,
        USDC.address,
        fr4USDC.address,
        fr4ETH.address,
        mintAmountUSDC,
        borrowAmountETH,
      );
    const fr4USDCTokenBalance3 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance3).to.be.gt(fr4USDCTokenBalance2);
    const fr4ETHBalance3 = await fr4ETH.borrowBalanceCurrent(position.address);
    expect(fr4ETHBalance3).to.equal(borrowAmountETH);
    const ethBalance3 = await ethers.provider.getBalance(attacker.address);
    expect(ethBalance3).to.be.gt(ethBalance2);

    const fr4ETHTokenBalance3 = await fr4ETH.balanceOfUnderlying(position.address);
    expect(fr4ETHTokenBalance3).to.equal(BigNumber.from(0));
    const fr4DAIBalance3 = await fr4DAI.borrowBalanceCurrent(position.address);
    const DAIBalance3 = await DAI.balanceOf(attacker.address);
    const mintAmountETH = ethers.utils.parseEther("10");
    await position
      .connect(attacker)
      .mintETHAndBorrow(FusePool4.address, fr4ETH.address, DAI.address, fr4DAI.address, borrowAmountDAI, {
        value: mintAmountETH,
      });
    const fr4ETHTokenBalance4 = await fr4ETH.balanceOfUnderlying(position.address);
    expect(fr4ETHTokenBalance4).to.be.gt(fr4ETHTokenBalance3);
    const fr4DAIBalance4 = await fr4DAI.borrowBalanceCurrent(position.address);
    expect(fr4DAIBalance4).to.be.gt(fr4DAIBalance3);
    const DAIBalance4 = await DAI.balanceOf(attacker.address);
    expect(DAIBalance4).to.equal(DAIBalance3.add(borrowAmountDAI));
  });

  it("should repay and redeem", async () => {
    const mintAmountDAI = ethers.utils.parseUnits("100000", await DAI.decimals());
    await DAI.connect(impersonateAddressSigner).transfer(position.address, mintAmountDAI);
    const borrowAmountUSDC = ethers.utils.parseUnits("10000", await USDC.decimals());
    await position
      .connect(attacker)
      .mintAndBorrow(
        FusePool4.address,
        DAI.address,
        fr4DAI.address,
        USDC.address,
        fr4USDC.address,
        mintAmountDAI,
        borrowAmountUSDC,
      );
    const frDAIToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      fr4DAI.address,
    )) as IERC20;
    const frDAIBalance1 = await frDAIToken.balanceOf(position.address);
    const redeemAmount1 = frDAIBalance1.div(2);
    const daiBalance1 = await DAI.balanceOf(attacker.address);
    const frUSDCBalance1 = await fr4USDC.borrowBalanceCurrent(position.address);
    await USDC.connect(impersonateAddressSigner).transfer(position.address, frUSDCBalance1);
    await position
      .connect(attacker)
      .repayAndRedeem(DAI.address, fr4DAI.address, USDC.address, fr4USDC.address, redeemAmount1, frUSDCBalance1);
    const frDAIBalance2 = await frDAIToken.balanceOf(position.address);
    expect(frDAIBalance2).to.be.lt(frDAIBalance1);
    const daiBalance2 = await DAI.balanceOf(attacker.address);
    expect(daiBalance2).to.gt(daiBalance1);
    const frUSDCBalance2 = await fr4USDC.borrowBalanceCurrent(position.address);
    expect(frUSDCBalance2).to.be.lt(frUSDCBalance1);

    await DAI.connect(impersonateAddressSigner).transfer(position.address, mintAmountDAI);
    const borrowAmountETH = ethers.utils.parseEther("2");
    await position
      .connect(attacker)
      .mintAndBorrowETH(FusePool4.address, DAI.address, fr4DAI.address, fr4ETH.address, mintAmountDAI, borrowAmountETH);
    const frDAIBalance3 = await frDAIToken.balanceOf(position.address);
    const redeemAmount3 = frDAIBalance3.div(2);
    const daiBalance3 = await DAI.balanceOf(attacker.address);
    const frETHBalance3 = await fr4ETH.borrowBalanceCurrent(position.address);
    await position
      .connect(attacker)
      .repayETHAndRedeem(DAI.address, fr4DAI.address, fr4ETH.address, redeemAmount3, { value: frETHBalance3 });
    const frDAIBalance4 = await frDAIToken.balanceOf(position.address);
    expect(frDAIBalance4).to.be.lt(frDAIBalance3);
    const daiBalance4 = await DAI.balanceOf(attacker.address);
    expect(daiBalance4).to.gt(daiBalance3);
    const frETHBalance4 = await fr4USDC.borrowBalanceCurrent(position.address);
    expect(frETHBalance4).to.be.lt(frETHBalance3);

    const frETHToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      fr4ETH.address,
    )) as IERC20;
    const mintAmountETH = ethers.utils.parseEther("10");
    await position
      .connect(attacker)
      .mintETHAndBorrow(FusePool4.address, fr4ETH.address, USDC.address, fr4USDC.address, borrowAmountUSDC, {
        value: mintAmountETH,
      });
    const frETHBalance5 = await frETHToken.balanceOf(position.address);
    const redeemAmount5 = frETHBalance5.div(2);
    const ethBalance5 = await ethers.provider.getBalance(attacker.address);
    const frUSDCBalance5 = await fr4USDC.borrowBalanceCurrent(position.address);
    await USDC.connect(impersonateAddressSigner).transfer(position.address, frUSDCBalance5);
    await position
      .connect(attacker)
      .repayAndRedeemETH(fr4ETH.address, USDC.address, fr4USDC.address, redeemAmount5, frUSDCBalance5);
    const frETHBalance6 = await frETHToken.balanceOf(position.address);
    expect(frETHBalance6).to.be.lt(frETHBalance5);
    const ethBalance6 = await ethers.provider.getBalance(attacker.address);
    expect(ethBalance6).to.be.gt(ethBalance5);
    const frUSDCBalance6 = await fr4USDC.borrowBalanceCurrent(position.address);
    expect(frUSDCBalance6).to.be.lt(frUSDCBalance5);
  });
});
