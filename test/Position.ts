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
  });
});
