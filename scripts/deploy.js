//const { ethers, upgrades } = require("hardhat");
//
//async function main() {
//  // Deploy IdentityToken
//  const IdentityToken = await ethers.getContractFactory("IdentityToken");
//  const identityToken = await IdentityToken.deploy(1000000); // Replace with your desired initial supply
//
//  await identityToken.deployed();
//
//  console.log("IdentityToken deployed to:", identityToken.address);
//
//  // Deploy IdentityVerificationDAO
//  const IdentityVerificationDAO = await ethers.getContractFactory("IdentityVerificationDAO");
//  const identityVerificationDAO = await upgrades.deployProxy(IdentityVerificationDAO, [identityToken.address], { initializer: "initialize" });
//
//  await identityVerificationDAO.deployed();
//
//  console.log("IdentityVerificationDAO deployed to:", identityVerificationDAO.address);
//}
//
//main()
//  .then(() => process.exit(0))
//  .catch((error) => {
//    console.error(error);
//    process.exit(1);
//  });
//

const { ethers, upgrades } = require("hardhat");

async function main() {
  try {
    // Deploy IdentityToken
    const IdentityToken = await ethers.getContractFactory("IdentityToken");
    const identityToken = await IdentityToken.deploy(1000000); // Replace with your desired initial supply

    await identityToken.deployed();

    console.log("IdentityToken deployed to:", identityToken.address);

    // Deploy IdentityVerificationDAO
    const IdentityVerificationDAO = await ethers.getContractFactory("IdentityVerificationDAO");
    const identityVerificationDAO = await upgrades.deployProxy(IdentityVerificationDAO, [identityToken.address], { initializer: "initialize" });

    await identityVerificationDAO.deployed();

    console.log("IdentityVerificationDAO deployed to:", identityVerificationDAO.address);
  } catch (error) {
    console.error("Error deploying contracts:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script error:", error);
    process.exit(1);
  });
