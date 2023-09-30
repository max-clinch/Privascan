// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract IdentityVerificationDAO is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    IERC20 public token; // The ERC20 token used for rewards and escrows

    bool public emergencyShutdown; // Flag indicating whether emergency shutdown is active

    // Struct to store identity information
    struct IdentityInfo {
        string fullName;
        uint256 dateOfBirth;
        string gender;
        string contactDetails;
        bool verified;
    }

    mapping(address => IdentityInfo) public identityInfo;

    // Whitelist and blacklist mappings
    mapping(address => bool) public whitelist;
    mapping(address => bool) public blacklist;

    // Reputation and reward mappings
    mapping(address => uint256) public reputation;
    mapping(address => uint256) public rewards;

    // Struct to manage escrows
    struct Escrow {
        uint256 amount;
        uint256 releaseTimestamp;
        bool released;
        bool disputed;
    }

    mapping(address => Escrow) public escrows;

    event ReputationUpdated(address indexed user, uint256 newReputation);
    event IdentityVerified(
        address indexed subject,
        address indexed verifier,
        bool verified
    );
    event NotificationSent(address indexed recipient, string message);
    event AddedToWhitelist(address indexed entity);
    event RemovedFromWhitelist(address indexed entity);
    event AddedToBlacklist(address indexed entity);
    event RemovedFromBlacklist(address indexed entity);
    event RewardEarned(address indexed user, uint256 amount);
    event EscrowCreated(
        address indexed vouchingAddress,
        address indexed subject,
        uint256 amount,
        uint256 releaseTimestamp
    );
    event EscrowReleased(
        address indexed vouchingAddress,
        address indexed subject,
        uint256 amount
    );
    event EscrowDisputed(
        address indexed vouchingAddress,
        address indexed subject,
        uint256 amount
    );
    event EmergencyShutdownActivated();
    event EmergencyShutdownDeactivated();

    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
    }

    // Function to activate the emergency shutdown (onlyOwner)
    function activateEmergencyShutdown() external onlyOwner {
        require(!emergencyShutdown, "Emergency shutdown is already active.");
        emergencyShutdown = true;
        emit EmergencyShutdownActivated();
    }

    // Function to deactivate the emergency shutdown (onlyOwner)
    function deactivateEmergencyShutdown() external onlyOwner {
        require(emergencyShutdown, "Emergency shutdown is not active.");
        emergencyShutdown = false;
        emit EmergencyShutdownDeactivated();
    }

    modifier notInEmergencyShutdown() {
        require(!emergencyShutdown, "Emergency shutdown is active.");
        _;
    }

    // Function to verify an identity with basic information
    function verifyIdentity(
        string memory fullName,
        uint256 dateOfBirth,
        string memory gender,
        string memory contactDetails,
        address subject
    ) external onlyOwner notInEmergencyShutdown {
        require(subject != address(0), "Invalid subject address");
        require(
            !identityInfo[subject].verified,
            "Subject is already verified"
        );
        require(
            !blacklist[subject],
            "Subject is blacklisted and cannot be verified"
        );

        // Your custom verification logic goes here
        // For simplicity, we assume all components are valid in this example
        bool verificationPassed = true;

        if (verificationPassed) {
            // Store identity data
            identityInfo[subject] = IdentityInfo({
                fullName: fullName,
                dateOfBirth: dateOfBirth,
                gender: gender,
                contactDetails: contactDetails,
                verified: true
            });

            // Update the verifier's reputation positively for a successful verification
            updateReputation(msg.sender, 10);

            // Reward the verifier with tokens
            uint256 rewardAmount = calculateReward(10);
            rewards[msg.sender] = rewards[msg.sender].add(rewardAmount);
            token.transfer(msg.sender, rewardAmount);

            emit IdentityVerified(subject, msg.sender, true);
            emit RewardEarned(msg.sender, rewardAmount);
        } else {
            emitNotification(subject, "Identity verification failed.");
        }
    }

    // Function to add an address to the whitelist
    function addToWhitelist(address entity) external onlyOwner {
        whitelist[entity] = true;
        emit AddedToWhitelist(entity);
    }

    // Function to remove an address from the whitelist
    function removeFromWhitelist(address entity) external onlyOwner {
        whitelist[entity] = false;
        emit RemovedFromWhitelist(entity);
    }

    // Function to add an address to the blacklist
    function addToBlacklist(address entity) external onlyOwner {
        blacklist[entity] = true;
        emit AddedToBlacklist(entity);
    }

    // Function to remove an address from the blacklist
    function removeFromBlacklist(address entity) external onlyOwner {
        blacklist[entity] = false;
        emit RemovedFromBlacklist(entity);
    }

    // Function to check if an address is on the whitelist
    function isWhitelisted(address entity) external view returns (bool) {
        return whitelist[entity];
    }

    // Function to check if an address is on the blacklist
    function isBlacklisted(address entity) external view returns (bool) {
        return blacklist[entity];
    }

    // Function to create an escrow for vouching
    function vouchForIdentity(
        address subject,
        uint256 amount,
        uint256 releaseTimestamp
    ) external notInEmergencyShutdown {
        require(
            token.balanceOf(msg.sender) >= amount,
            "Insufficient tokens to vouch"
        );
        require(
            !identityInfo[subject].verified,
            "Subject is already verified"
        );
        require(
            escrows[msg.sender].amount == 0,
            "An active escrow already exists"
        );

        // Create an escrow for the vouch
        escrows[msg.sender] = Escrow({
            amount: amount,
            releaseTimestamp: releaseTimestamp,
            released: false,
            disputed: false
        });

        emit EscrowCreated(msg.sender, subject, amount, releaseTimestamp);

        // Lock the tokens
        token.transferFrom(msg.sender, address(this), amount);
    }

    // Function for the subject to release escrow after verification
    function releaseEscrow() external notInEmergencyShutdown {
        require(
            escrows[msg.sender].released == false,
            "Escrow already released"
        );
        require(
            escrows[msg.sender].releaseTimestamp <= block.timestamp,
            "Escrow release time not reached"
        );

        address vouchingAddress = msg.sender;
        uint256 amount = escrows[vouchingAddress].amount;

        // Mark the escrow as released
        escrows[vouchingAddress].released = true;

        // Transfer the escrowed tokens to the vouched subject
        token.transfer(msg.sender, amount);

        emit EscrowReleased(vouchingAddress, msg.sender, amount);
    }

    // Function for the subject to dispute the escrow in case of fraudulent identity
    function disputeEscrow() external notInEmergencyShutdown {
        require(
            escrows[msg.sender].released == false,
            "Escrow already released"
        );
        require(!escrows[msg.sender].disputed, "Escrow already disputed");

        address vouchingAddress = msg.sender;
        uint256 amount = escrows[vouchingAddress].amount;

        // Mark the escrow as disputed
        escrows[vouchingAddress].disputed = true;

        // Transfer the escrowed tokens to the vouching address
        token.transfer(vouchingAddress, amount);

        emit EscrowDisputed(vouchingAddress, msg.sender, amount);
    }

    // Function to calculate the reward amount based on reputation
    function calculateReward(uint256 reputationPoints)
        internal
        pure
        returns (uint256)
    {
        return reputationPoints * 100; // 100 tokens per reputation point
    }

    // Function to update a user's reputation
    function updateReputation(address user, uint256 newReputation) internal {
        reputation[user] = reputation[user].add(newReputation);
        emit ReputationUpdated(user, reputation[user]);
    }

    // Function to send a notification to a user
    function emitNotification(address recipient, string memory message)
        internal
    {
        emit NotificationSent(recipient, message);
    }
}
