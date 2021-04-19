// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { IFuseMarginController } from "./interfaces/IFuseMarginController.sol";
import { Adapter } from "./FuseMarginV1/Adapter/Adapter.sol";
import { Uniswap } from "./FuseMarginV1/FlashLoan/Uniswap.sol";
import { FuseMarginBase } from "./FuseMarginV1/Base/FuseMarginBase.sol";
import { IPosition } from "./interfaces/IPosition.sol";

/// @author Ganesh Gautham Elango
/// @title FuseMargin contract that handles opening and closing of positions
contract FuseMarginV1 is Uniswap, FuseMarginBase {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @dev Position contract address
    address public immutable override positionImplementation;
    /// @dev FuseMarginController contract ERC721 interface
    IERC721 internal immutable fuseMarginERC721;

    /// @param _fuseMarginController FuseMarginController address
    /// @param _positionImplementation Position address
    /// @param _uniswapFactory Uniswap V2 Factory address
    constructor(
        address _fuseMarginController,
        address _positionImplementation,
        address _uniswapFactory
    ) Adapter(_uniswapFactory) FuseMarginBase(_fuseMarginController) {
        fuseMarginERC721 = IERC721(_fuseMarginController);
        positionImplementation = _positionImplementation;
    }

    /// @dev Checks if caller owns the positions tokenId
    /// @param tokenId Index of positions array in FuseMarginController contract
    modifier isOwner(uint256 tokenId) {
        require(msg.sender == fuseMarginERC721.ownerOf(tokenId), "FuseMarginV1: Not owner of position");
        _;
    }

    /// @dev Opens a new position, provided an amount of base tokens, must approve base providedAmount before calling
    /// @param pair Uniswap V2 pair address to flash loan quote from
    /// @param base Base token address
    /// @param quote Quote token address (will be flash loaned from Uniswap)
    /// @param pairToken The token other than quote in the Uniswap pair
    /// @param providedAmount Amount of base provided
    /// @param amount0Out Desired amount of token0 to borrow (0 if not being borrowed)
    /// @param amount1Out Desired amount of token1 to borrow (0 if not being borrowed)
    /// @param fusePool Encoded fuse pool details (address comptroller, address cBase, address cQuote)
    /// @param exchangeData Encoded swap details (address exchange, bytes memory data)
    /// @return tokenId of new position
    function openPosition(
        IUniswapV2Pair pair,
        address base,
        address quote,
        address pairToken,
        uint256 providedAmount,
        uint256 amount0Out,
        uint256 amount1Out,
        bytes calldata fusePool,
        bytes calldata exchangeData
    ) external override returns (uint256) {
        IERC20(base).safeTransferFrom(msg.sender, address(this), providedAmount);
        address newPosition = _newPosition();
        bytes memory data = abi.encode(0, msg.sender, newPosition, base, quote, pairToken, fusePool, exchangeData);
        pair.swap(amount0Out, amount1Out, address(this), data);
        return fuseMarginController.newPosition(msg.sender, newPosition);
    }

    /// @dev Closes an existing position, caller must own tokenId
    /// @param pair Uniswap V2 pair address to flash loan base from
    /// @param base Base token address (will be flash loaned from Uniswap)
    /// @param quote Quote token address
    /// @param pairToken The token other than base in the Uniswap pair
    /// @param tokenId Position tokenId to close
    /// @param amount0Out Desired amount of token0 to borrow (0 if not being borrowed)
    /// @param amount1Out Desired amount of token1 to borrow (0 if not being borrowed)
    /// @param fusePool Encoded fuse pool details (address comptroller, address cBase, address cQuote)
    /// @param exchangeData Encoded swap details (address exchange, bytes memory data)
    function closePosition(
        IUniswapV2Pair pair,
        address base,
        address quote,
        address pairToken,
        uint256 tokenId,
        uint256 amount0Out,
        uint256 amount1Out,
        bytes calldata fusePool,
        bytes calldata exchangeData
    ) external override isOwner(tokenId) {
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
