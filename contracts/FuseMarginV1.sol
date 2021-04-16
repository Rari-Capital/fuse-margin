// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { IFuseMarginController } from "./interfaces/IFuseMarginController.sol";
import { Adapter } from "./FuseMarginV1/Adapter.sol";
import { Uniswap } from "./FuseMarginV1/Uniswap.sol";
import { DYDX } from "./FuseMarginV1/DYDX.sol";
import { IPosition } from "./interfaces/IPosition.sol";

import "hardhat/console.sol";

/// @author Ganesh Gautham Elango
/// @title FuseMargin contract that handles opening and closing of positions
contract FuseMarginV1 is Uniswap, DYDX {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IFuseMarginController public immutable fuseMarginController;
    IERC721 public immutable fuseMarginERC721;
    address public immutable positionImplementation;

    constructor(
        address _fuseMarginController,
        address _positionImplementation,
        address _uniswapFactory,
        address _soloMargin
    ) Adapter(_uniswapFactory, _soloMargin) {
        fuseMarginController = IFuseMarginController(_fuseMarginController);
        fuseMarginERC721 = IERC721(_fuseMarginController);
        positionImplementation = _positionImplementation;
    }

    function openPositionBaseUniswap(
        IUniswapV2Pair pair,
        address base,
        address quote,
        address pairToken,
        uint256 providedAmount,
        uint256 borrowAmount,
        bytes calldata fusePool,
        bytes calldata exchangeData
    ) external returns (uint256) {
        IERC20(base).safeTransferFrom(msg.sender, address(this), providedAmount);
        address newPosition = _newPosition();
        (uint256 amount0Out, uint256 amount1Out) = _getUniswapAmounts(pair, quote, borrowAmount);
        bytes memory data = abi.encode(newPosition, base, quote, pairToken, fusePool, exchangeData);
        pair.swap(amount0Out, amount1Out, address(this), data);
        return fuseMarginController.newPosition(msg.sender, newPosition);
    }

    function _newPosition() internal returns (address) {
        address newPosition = Clones.clone(positionImplementation);
        IPosition(newPosition).initialize(fuseMarginController);
        return newPosition;
    }

    function _getUniswapAmounts(
        IUniswapV2Pair pair,
        address quote,
        uint256 borrowAmount
    ) internal view returns (uint256, uint256) {
        uint256 amount0Out = borrowAmount;
        uint256 amount1Out;
        address pairToken = pair.token1();
        if (quote == pairToken) {
            amount0Out = 0;
            amount1Out = borrowAmount;
            pairToken = pair.token0();
        }
        return (amount0Out, amount1Out);
    }
}
