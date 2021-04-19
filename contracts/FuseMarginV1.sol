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
import { Adapter } from "./FuseMarginV1/Adapter/Adapter.sol";
import { Uniswap } from "./FuseMarginV1/FlashLoan/Uniswap.sol";
import { IPosition } from "./interfaces/IPosition.sol";
import { CErc20Interface } from "./interfaces/CErc20Interface.sol";

/// @author Ganesh Gautham Elango
/// @title FuseMargin contract that handles opening and closing of positions
contract FuseMarginV1 is Uniswap {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IFuseMarginController public immutable fuseMarginController;
    IERC721 public immutable fuseMarginERC721;
    address public immutable positionImplementation;

    constructor(
        address _fuseMarginController,
        address _positionImplementation,
        address _uniswapFactory
    ) Adapter(_uniswapFactory) {
        fuseMarginController = IFuseMarginController(_fuseMarginController);
        fuseMarginERC721 = IERC721(_fuseMarginController);
        positionImplementation = _positionImplementation;
    }

    modifier isOwner(uint256 tokenId) {
        require(msg.sender == fuseMarginERC721.ownerOf(tokenId), "FuseMarginV1: Not owner of position");
        _;
    }

    function openPositionBaseUniswap(
        IUniswapV2Pair pair,
        address base,
        address quote,
        address pairToken,
        uint256 providedAmount,
        uint256 amount0Out,
        uint256 amount1Out,
        bytes calldata fusePool,
        bytes calldata exchangeData
    ) external returns (uint256) {
        IERC20(base).safeTransferFrom(msg.sender, address(this), providedAmount);
        address newPosition = _newPosition();
        bytes memory data = abi.encode(0, msg.sender, newPosition, base, quote, pairToken, fusePool, exchangeData);
        pair.swap(amount0Out, amount1Out, address(this), data);
        return fuseMarginController.newPosition(msg.sender, newPosition);
    }

    function closePositionBaseUniswap(
        IUniswapV2Pair pair,
        address base,
        address quote,
        address pairToken,
        uint256 tokenId,
        uint256 amount0Out,
        uint256 amount1Out,
        bytes calldata fusePool,
        bytes calldata exchangeData
    ) external isOwner(tokenId) {
        bytes memory data =
            abi.encode(
                1,
                msg.sender,
                fuseMarginController.positions(tokenId),
                base,
                quote,
                pairToken,
                fusePool,
                exchangeData
            );
        pair.swap(amount0Out, amount1Out, address(this), data);
        fuseMarginController.closePosition(tokenId);
    }

    function _newPosition() internal returns (address) {
        address newPosition = Clones.clone(positionImplementation);
        IPosition(newPosition).initialize(fuseMarginController);
        return newPosition;
    }
}
