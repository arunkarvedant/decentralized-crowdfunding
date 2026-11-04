import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = hre;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("----------------------------------------------------");
  console.log("Deploying Crowdfunding Platform smart contracts...");
  console.log("----------------------------------------------------");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. Deploy Campaign implementation
  const Campaign = await ethers.getContractFactory("Campaign");
  const implementation = await Campaign.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  console.log("Campaign Implementation deployed to:", implementationAddress);

  // 2. Deploy CampaignFactory
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  const initialFeeBps = 200; // 2%
  const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
  const factory = await CampaignFactory.deploy(implementationAddress, treasuryAddress, initialFeeBps);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("CampaignFactory deployed to:", factoryAddress);
  console.log("Treasury address:", treasuryAddress);
  console.log("Initial Fee Bps:", initialFeeBps);

  // Export contract addresses and ABIs to frontend
  const frontendContractsDir = path.resolve(__dirname, "../../frontend/src/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  const CampaignArtifact = await hre.artifacts.readArtifact("Campaign");
  const FactoryArtifact = await hre.artifacts.readArtifact("CampaignFactory");

  const contractsData = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    factoryAddress,
    implementationAddress,
    treasuryAddress,
    feeBps: initialFeeBps,
    factoryAbi: FactoryArtifact.abi,
    campaignAbi: CampaignArtifact.abi,
  };

  fs.writeFileSync(
    path.join(frontendContractsDir, "deployedContracts.json"),
    JSON.stringify(contractsData, null, 2)
  );

  console.log("Contract metadata written to frontend/src/contracts/deployedContracts.json");
  console.log("Deployment completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
