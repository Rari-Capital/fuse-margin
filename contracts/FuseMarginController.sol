// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IFuseMarginController } from "./interfaces/IFuseMarginController.sol";

/// @author Ganesh Gautham Elango
/// @title Core contract for controlling the Fuse margin trading protocol
contract FuseMarginController is IFuseMarginController, ERC721, Ownable {
    using SafeMath for uint256;

    // Gets a position address given an index (index = tokenId)
    address[] public override positions;
    // List of supported FuseMargin contracts
    address[] public override marginContracts;
    // Check if FuseMargin contract address is approved
    mapping(address => bool) public override approvedContracts;

    // Number of FuseMargin contracts
    uint256 private marginContractsNum = 0;

    /// @param name_ ERC721 name
    /// @param symbol_ ERC721 symbol
    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    /// @dev Ensures functions are called from approved FuseMargin contracts
    modifier onlyMargin() {
        require(approvedContracts[msg.sender], "FuseMarginController: Not approved contract");
        _;
    }

    /// @dev Creates a position NFT, to be called only from FuseMargin
    /// @param user User to give the NFT to
    /// @param position The position address
    /// @return tokenId of the position
    function newPosition(address user, address position) external override onlyMargin returns (uint256) {
        positions.push(position);
        uint256 positionIndex = positions.length - 1;
        _safeMint(user, positionIndex);
        return positionIndex;
    }

    /// @dev Burns the position at the index, to be called only from FuseMargin
    /// @param tokenId tokenId of position to close
    function closePosition(uint256 tokenId) external override onlyMargin {
        _burn(tokenId);
    }

    /// @dev Adds support for a new FuseMargin contract, to be called only from owner
    /// @param contractAddress Address of FuseMargin contract
    function addMarginContract(address contractAddress) external override onlyOwner {
        require(!approvedContracts[contractAddress], "FuseMarginController: Already exists");
        marginContracts.push(contractAddress);
        approvedContracts[contractAddress] = true;
        marginContractsNum = marginContractsNum.add(1);
        emit AddMarginContract(contractAddress, msg.sender);
    }

    /// @dev Removes support for a new FuseMargin contract, to be called only from owner
    /// @param contractAddress Address of FuseMargin contract
    function removeMarginContract(address contractAddress) external override onlyOwner {
        require(approvedContracts[contractAddress], "FuseMarginController: Does not exist");
        approvedContracts[contractAddress] = false;
        marginContractsNum = marginContractsNum.sub(1);
        emit RemoveMarginContract(contractAddress, msg.sender);
    }

    /// @dev Gets all approved margin contracts
    /// @return List of the addresses of the approved margin contracts
    function getMarginContracts() external view override returns (address[] memory) {
        address[] memory approvedMarginContracts = new address[](marginContractsNum);
        uint256 i = 0;
        for (uint256 j = 0; j < marginContracts.length; j++) {
            if (approvedContracts[marginContracts[j]]) {
                approvedMarginContracts[i] = marginContracts[j];
            }
            i++;
        }
        return approvedMarginContracts;
    }

    /// @dev Gets all tokenIds and positions a user holds
    /// @param user Address of user
    /// @return List of tokenIds the user holds
    /// @return List of positions the user holds
    function tokensOfOwner(address user) external view override returns (uint256[] memory, address[] memory) {
        uint256[] memory tokens = new uint256[](balanceOf(user));
        address[] memory addresses = new address[](balanceOf(user));
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            tokens[i] = tokenId;
            addresses[i] = positions[i];
        }
        return (tokens, addresses);
    }
}
