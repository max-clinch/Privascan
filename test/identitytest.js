const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai")

//const { expect } = require('chai');
//const { ethers } = require('hardhat');

describe('IdentityVerificationDAO', function () {
  let IdentityVerificationDAO;
  let identityVerificationDAO;
  let Token;
  let token;
  let owner, user1, user2;

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    Token = await ethers.getContractFactory('YourTokenContract'); // Replace with your token contract name
    token = await Token.deploy();

    IdentityVerificationDAO = await ethers.getContractFactory('IdentityVerificationDAO');
    identityVerificationDAO = await IdentityVerificationDAO.deploy(token.address);
    await identityVerificationDAO.deployed();
  });

  it('should add government-issued identification data', async function () {
    const idNumber = '12345';
    const imageURI = 'https://www.google.com/id-image.jpg';

    await identityVerificationDAO.addGovernmentIdentificationData(idNumber, imageURI);

    const governmentData = await identityVerificationDAO.governmentIdentification(user1.address);
    expect(governmentData.idNumber).to.equal(idNumber);
    expect(governmentData.imageURI).to.equal(imageURI);
  });

  it('should add biometric data', async function () {
    const facialScanImageURI = 'https://www.google.com/facial-scan.jpg';
    const fingerprintData = 'fingerprint123';

    await identityVerificationDAO.addBiometricData(facialScanImageURI, fingerprintData);

    const biometricData = await identityVerificationDAO.biometricData(user1.address);
    expect(biometricData.facialScanImageURI).to.equal(facialScanImageURI);
    expect(biometricData.fingerprintData).to.equal(fingerprintData);
  });

  it('should give consent and authorization', async function () {
    const digitalSignature = 'signature123';
    const agreedToTerms = true;

    await identityVerificationDAO.giveConsentAndAuthorization(digitalSignature, agreedToTerms);

    const consentAuth = await identityVerificationDAO.consentAuthorization(user1.address);
    expect(consentAuth.digitalSignature).to.equal(digitalSignature);
    expect(consentAuth.agreedToTerms).to.equal(agreedToTerms);
  });

  it('should set authentication data', async function () {
    const secureCredentialsHash = 'hash123';
    const twoFactorEnabled = true;

    await identityVerificationDAO.setAuthenticationData(secureCredentialsHash, twoFactorEnabled);

    const authData = await identityVerificationDAO.authenticationData(user1.address);
    expect(authData.secureCredentialsHash).to.equal(secureCredentialsHash);
    expect(authData.twoFactorEnabled).to.equal(twoFactorEnabled);
  });

  it('should calculate the correct reward based on reputation', async function () {
    const reputationPoints = 10;
    const expectedReward = reputationPoints * 100; // 100 tokens per reputation point

    const actualReward = await identityVerificationDAO.calculateReward(reputationPoints);

    expect(actualReward).to.equal(expectedReward);
  });

  it('should update the user\'s reputation correctly', async function () {
    const initialReputation = await identityVerificationDAO.reputation(user1.address);

    const newReputation = 20;
    await identityVerificationDAO.updateReputation(user1.address, newReputation);

    const updatedReputation = await identityVerificationDAO.reputation(user1.address);
    expect(updatedReputation).to.equal(initialReputation.add(newReputation));
  });

  it('should emit a notification to a user', async function () {
    const message = 'You have a new notification.';
    const notificationTx = await identityVerificationDAO.emitNotification(user1.address, message);

    // Ensure the event was emitted with the correct parameters
    const receipt = await notificationTx.wait();
    const event = receipt.events.find((e) => e.event === 'NotificationSent');

    expect(event.args.recipient).to.equal(user1.address);
    expect(event.args.message).to.equal(message);
  });


  it('should activate and deactivate emergency shutdown', async function () {
    const emergencyShutdownStatusBefore = await identityVerificationDAO.emergencyShutdown();

    // Activate emergency shutdown
    await identityVerificationDAO.activateEmergencyShutdown();
    const emergencyShutdownStatusDuring = await identityVerificationDAO.emergencyShutdown();
    expect(emergencyShutdownStatusDuring).to.be.true;

    // Deactivate emergency shutdown
    await identityVerificationDAO.deactivateEmergencyShutdown();
    const emergencyShutdownStatusAfter = await identityVerificationDAO.emergencyShutdown();
    expect(emergencyShutdownStatusAfter).to.be.false;
  });

  it('should add and remove addresses from whitelist', async function () {
    const userAddress = user1.address;

    // Add to whitelist
    await identityVerificationDAO.addToWhitelist(userAddress);
    const isUserInWhitelist = await identityVerificationDAO.isWhitelisted(userAddress);
    expect(isUserInWhitelist).to.be.true;

    // Remove from whitelist
    await identityVerificationDAO.removeFromWhitelist(userAddress);
    const isUserRemovedFromWhitelist = await identityVerificationDAO.isWhitelisted(userAddress);
    expect(isUserRemovedFromWhitelist).to.be.false;
  });

  it('should add and remove addresses from blacklist', async function () {
    const userAddress = user1.address;

    // Add to blacklist
    await identityVerificationDAO.addToBlacklist(userAddress);
    const isUserInBlacklist = await identityVerificationDAO.isBlacklisted(userAddress);
    expect(isUserInBlacklist).to.be.true;

    // Remove from blacklist
    await identityVerificationDAO.removeFromBlacklist(userAddress);
    const isUserRemovedFromBlacklist = await identityVerificationDAO.isBlacklisted(userAddress);
    expect(isUserRemovedFromBlacklist).to.be.false;
  });

  it('should vouch for identity and release escrow', async function () {
    const amount = ethers.utils.parseEther('1.0');
    const releaseTimestamp = Math.floor(Date.now() / 1000) + 3600; // Set release time 1 hour from now

    // Vouch for identity
    await token.connect(user1).approve(identityVerificationDAO.address, amount);
    await identityVerificationDAO.connect(user1).vouchForIdentity(user2.address, amount, releaseTimestamp);
    const escrowInfo = await identityVerificationDAO.escrows(user1.address);
    expect(escrowInfo.amount).to.equal(amount);

    // Release escrow
    await identityVerificationDAO.connect(user2).releaseEscrow();
    const updatedEscrowInfo = await identityVerificationDAO.escrows(user1.address);
    expect(updatedEscrowInfo.released).to.be.true;
  });


  it('should dispute escrow', async function () {
    const amount = ethers.utils.parseEther('1.0');
    const releaseTimestamp = Math.floor(Date.now() / 1000) + 3600; // Set release time 1 hour from now

    // Vouch for identity
    await token.connect(user1).approve(identityVerificationDAO.address, amount);
    await identityVerificationDAO.connect(user1).vouchForIdentity(user2.address, amount, releaseTimestamp);

    // Dispute escrow
    await identityVerificationDAO.connect(user2).disputeEscrow();
    const updatedEscrowInfo = await identityVerificationDAO.escrows(user1.address);
    expect(updatedEscrowInfo.disputed).to.be.true;
  });

  it('should give consent and authorization', async function () {
    const digitalSignature = 'signature123';
    const agreedToTerms = true;

    await identityVerificationDAO.giveConsentAndAuthorization(digitalSignature, agreedToTerms);

    const consentAuth = await identityVerificationDAO.consentAuthorization(user1.address);
    expect(consentAuth.digitalSignature).to.equal(digitalSignature);
    expect(consentAuth.agreedToTerms).to.equal(agreedToTerms);
  });

  it('should set authentication data', async function () {
    const secureCredentialsHash = 'hash123';
    const twoFactorEnabled = true;

    await identityVerificationDAO.setAuthenticationData(secureCredentialsHash, twoFactorEnabled);

    const authData = await identityVerificationDAO.authenticationData(user1.address);
    expect(authData.secureCredentialsHash).to.equal(secureCredentialsHash);
    expect(authData.twoFactorEnabled).to.equal(twoFactorEnabled);
  });


});
