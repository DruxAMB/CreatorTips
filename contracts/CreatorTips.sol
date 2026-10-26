// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "./ReentrancyGuardUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title CreatorTips — tip creators in BOT by handle instead of address.
/// A creator calls setHandle once; supporters call tipHandle
/// with BOT value. Each tip splits 95% to the creator, 5% to the treasury.
/// Handles are normalized on-chain to lowercase [a-z0-9._-].
contract CreatorTips is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, OwnableUpgradeable {
    uint256 public constant CREATOR_BPS = 9500; // 95%
    uint256 public constant TREASURY_BPS = 500; // 5%
    uint256 public constant MIN_TIP = 0.001 ether;

    mapping(bytes32 => address) public handleOwner;
    mapping(address => string) public handleOf;
    address public treasury;
    uint256 public totalTipped;

    event HandleSet(address indexed creator, string handle);
    event Tipped(
        bytes32 indexed handleKey,
        string handle,
        address indexed tipper,
        address indexed creator,
        uint256 amount,
        uint256 creatorAmount,
        uint256 treasuryAmount
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address owner_, address treasury_) external initializer {
        require(treasury_ != address(0), "zero treasury");
        __Ownable_init(owner_);
        __ReentrancyGuard_init();
        treasury = treasury_;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "zero treasury");
        treasury = treasury_;
    }

    /// @notice Claim a handle for your wallet. One handle per wallet; setting a
    /// new one frees the old. Lowercase alnum plus dot, underscore, dash; 2-32 chars.
    function setHandle(string calldata handle) external {
        bytes32 key = _validateAndKey(handle);
        require(handleOwner[key] == address(0), "handle taken");

        string memory old = handleOf[msg.sender];
        if (bytes(old).length != 0) delete handleOwner[_keyUnchecked(old)];

        handleOwner[key] = msg.sender;
        handleOf[msg.sender] = handle;
        emit HandleSet(msg.sender, handle);
    }

    function tipHandle(string calldata handle) external payable nonReentrant {
        bytes32 key = _keyUnchecked(handle);
        address creator = handleOwner[key];
        require(creator != address(0), "unknown handle");
        require(msg.value >= MIN_TIP, "tip too small");

        uint256 fee = (msg.value * TREASURY_BPS) / 10_000;
        uint256 toCreator = msg.value - fee;

        (bool ok1, ) = creator.call{value: toCreator}("");
        require(ok1, "creator transfer failed");
        (bool ok2, ) = treasury.call{value: fee}("");
        require(ok2, "treasury transfer failed");

        totalTipped += msg.value;
        emit Tipped(key, handle, msg.sender, creator, msg.value, toCreator, fee);
    }

    function resolveHandle(string calldata handle) external view returns (address) {
        return handleOwner[_keyUnchecked(handle)];
    }

    function _keyUnchecked(string memory handle) internal pure returns (bytes32) {
        return keccak256(bytes(handle));
    }

    function _validateAndKey(string calldata handle) internal pure returns (bytes32) {
        bytes memory b = bytes(handle);
        require(b.length >= 2 && b.length <= 32, "handle length");
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7a) || // a-z
                (c >= 0x30 && c <= 0x39) || // 0-9
                c == 0x2e || c == 0x5f || c == 0x2d; // . _ -
            require(ok, "handle charset");
        }
        return keccak256(b);
    }

    uint256[46] private __gap;
}
