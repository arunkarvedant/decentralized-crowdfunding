import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers, network } = hre;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("----------------------------------------------------");
  console.log(`Deploying Crowdfunding Platform smart contracts to: ${network.name}`);
  console.log("----------------------------------------------------");

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId.toString();
  console.log("Deployer address:", deployer.address);
  console.log("Chain ID:", chainId);

  const isLocal = network.name === "hardhat" || network.name === "localhost";

  let owner = process.env.OWNER;
  let treasury = process.env.TREASURY;

  if (!isLocal) {
    if (!owner || !ethers.isAddress(owner)) {
      throw new Error("Missing or invalid OWNER environment variable for non-local network deployment.");
    }
    if (!treasury || !ethers.isAddress(treasury)) {
      throw new Error("Missing or invalid TREASURY environment variable for non-local network deployment.");
    }
  } else {
    owner = owner && ethers.isAddress(owner) ? owner : deployer.address;
    treasury = treasury && ethers.isAddress(treasury) ? treasury : deployer.address;
  }

  console.log("Target Factory Owner:", owner);
  console.log("Platform Treasury:", treasury);

  // 1. Deploy Campaign implementation
  const Campaign = await ethers.getContractFactory("Campaign");
  const implementation = await Campaign.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  console.log("Campaign Implementation deployed to:", implementationAddress);

  // 2. Deploy CampaignFactory
  const initialFeeBps = 200; // 2%
  const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
  const factory = await CampaignFactory.deploy(implementationAddress, treasury, initialFeeBps);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("CampaignFactory deployed to:", factoryAddress);

  // Transfer ownership if owner is different from deployer (Ownable2Step)
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log(`Initiating ownership transfer to ${owner}...`);
    const tx = await factory.transferOwnership(owner);
    await tx.wait();
    console.log(`Ownership transfer initiated. ${owner} must call acceptOwnership().`);
  }

  const startBlock = await ethers.provider.getBlockNumber();
  console.log("Start block:", startBlock);

  // Read artifacts for ABIs
  const CampaignArtifact = await hre.artifacts.readArtifact("Campaign");
  const FactoryArtifact = await hre.artifacts.readArtifact("CampaignFactory");

  // Write/Update frontend/src/contracts/deployedContracts.json keyed by chainId
  const frontendContractsDir = path.resolve(__dirname, "../../frontend/src/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  const deployedFilePath = path.join(frontendContractsDir, "deployedContracts.json");
  let deployedContracts = {};
  if (fs.existsSync(deployedFilePath)) {
    try {
      deployedContracts = JSON.parse(fs.readFileSync(deployedFilePath, "utf8"));
    } catch {
      deployedContracts = {};
    }
  }

  deployedContracts[chainId] = {
    factoryAddress,
    implementationAddress,
    startBlock,
    factoryAbi: FactoryArtifact.abi,
    campaignAbi: CampaignArtifact.abi,
  };

  fs.writeFileSync(deployedFilePath, JSON.stringify(deployedContracts, null, 2));

  console.log(`Contract metadata written to frontend/src/contracts/deployedContracts.json for chain ${chainId}`);
  console.log("Deployment completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
