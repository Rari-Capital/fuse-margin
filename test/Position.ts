import { ethers } from "hardhat";
import { Signer, Wallet } from "ethers";
import { expect } from "chai";

import { FuseMarginController, FuseMarginController__factory } from "../typechain";
import { fuseMarginControllerName, fuseMarginControllerSymbol } from "../scripts/constants/constructors";

describe("Position", () => {
  let accounts: Signer[];
  let fuseMarginController: FuseMarginController;

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const fuseMarginControllerFactory: FuseMarginController__factory = (await ethers.getContractFactory(
      "contracts/FuseMarginController.sol:FuseMarginController",
      <Wallet>accounts[0],
    )) as FuseMarginController__factory;
    fuseMarginController = await fuseMarginControllerFactory.deploy(
      fuseMarginControllerName,
      fuseMarginControllerSymbol,
    );
  });

  it("constructor should initialize state variables", async () => {
    const getName: string = await fuseMarginController.name();
    expect(getName).to.equal(fuseMarginControllerName);
    const getSymbol: string = await fuseMarginController.symbol();
    expect(getSymbol).to.equal(fuseMarginControllerSymbol);
  });
});
