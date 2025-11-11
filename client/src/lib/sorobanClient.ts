import { SOROBAN_RPC_URL, STAR_TOKEN_CONTRACT_ID, TOKEN_LAUNCH_CONTRACT_ID } from '@/config/contracts';
import {
  Networks,
  TransactionBuilder,
  Contract,
  Address as StellarAddress,
  xdr,
  nativeToScVal,
  scValToNative,
  Operation,
  Memo,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { Server } from '@stellar/stellar-sdk/rpc';

const server = new Server(SOROBAN_RPC_URL);

// Helper to get network passphrase based on network type
export function getNetworkPassphrase(network: 'testnet' | 'mainnet'): string {
  return network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;
}

// Helper to convert string to ScVal
function stringToScVal(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: 'string' });
}

// Helper to convert number to i128 ScVal
function numberToI128(value: number): xdr.ScVal {
  const bigIntValue = BigInt(Math.floor(value * 10000000)); // Convert to 7 decimals
  return nativeToScVal(bigIntValue, { type: 'i128' });
}

// Helper to convert number to u64 ScVal
function numberToU64(value: number): xdr.ScVal {
  return nativeToScVal(BigInt(value), { type: 'u64' });
}

/**
 * Build transaction to mint STAR points
 * This calls the mint_star_points function on the TokenLaunch contract
 */
export async function buildMintStarPointsTransaction(
  publicKey: string,
  xlmAmount: number,
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<string> {
  if (!TOKEN_LAUNCH_CONTRACT_ID || TOKEN_LAUNCH_CONTRACT_ID.includes('SAMPLE')) {
    throw new Error('Contracts not yet deployed. Please deploy Soroban contracts first.');
  }

  try {
    const account = await server.getAccount(publicKey);
    const contract = new Contract(TOKEN_LAUNCH_CONTRACT_ID);
    
    const amount = numberToI128(xlmAmount);
    const to = nativeToScVal(StellarAddress.fromString(publicKey), { type: 'address' });

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase(network),
    })
      .addOperation(
        contract.call('mint_star_points', to, amount)
      )
      .setTimeout(180)
      .build();

    const prepared = await server.prepareTransaction(tx);
    return prepared.toXDR();
  } catch (error) {
    console.error('Error building mint transaction:', error);
    throw new Error(`Failed to build mint transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build transaction to create a new project
 * This calls the create_project function on the TokenLaunch contract
 */
export async function buildCreateProjectTransaction(
  publicKey: string,
  projectData: {
    name: string;
    symbol: string;
    tokenAddress: string;
    totalSupply: string;
    airdropPercent: number;
    creatorPercent: number;
    liquidityPercent: number;
    minimumLiquidity: string;
    participationPeriodDays: number;
    hasVesting: boolean;
    vestingPeriodDays: number;
  },
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<string> {
  if (!TOKEN_LAUNCH_CONTRACT_ID || TOKEN_LAUNCH_CONTRACT_ID.includes('SAMPLE')) {
    throw new Error('Contracts not yet deployed. Please deploy Soroban contracts first.');
  }

  try {
    const account = await server.getAccount(publicKey);
    const contract = new Contract(TOKEN_LAUNCH_CONTRACT_ID);

    const currentTime = Math.floor(Date.now() / 1000);
    
    // Create plain JavaScript objects for the structs
    // The SDK will automatically handle lexicographic ordering when serializing
    const projectParamsObj = {
      name: projectData.name,
      symbol: projectData.symbol,
      token_address: projectData.tokenAddress,
      total_supply: BigInt(Math.floor(parseFloat(projectData.totalSupply) * 10000000))
    };

    const tokenomicsObj = {
      airdrop_allocation: BigInt(Math.floor((parseFloat(projectData.totalSupply) * projectData.airdropPercent / 100) * 10000000)),
      liquidity_allocation: BigInt(Math.floor((parseFloat(projectData.totalSupply) * projectData.liquidityPercent / 100) * 10000000)),
      team_allocation: BigInt(Math.floor((parseFloat(projectData.totalSupply) * projectData.creatorPercent / 100) * 10000000)),
      target_amount: BigInt(Math.floor(parseFloat(projectData.minimumLiquidity) * 10000000)),
      price_per_token: BigInt(10000000), // 1.0 with 7 decimals
      min_contribution: BigInt(100000000), // 10 XLM
      max_contribution: BigInt(100000000000) // 10000 XLM
    };

    const timingObj = {
      start_time: BigInt(currentTime),
      end_time: BigInt(currentTime + (projectData.participationPeriodDays * 24 * 60 * 60)),
      vesting_duration: BigInt(projectData.hasVesting ? (projectData.vestingPeriodDays || 0) * 24 * 60 * 60 : 0),
      vesting_cliff: BigInt(0)
    };

    // Use Contract.call with plain objects
    // The SDK will properly serialize them with sorted keys
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase(network),
    })
      .addOperation(
        contract.call(
          'create_project',
          publicKey, // creator - SDK will convert string to address
          projectParamsObj,
          tokenomicsObj,
          timingObj
        )
      )
      .setTimeout(180)
      .build();

    const prepared = await server.prepareTransaction(tx);
    return prepared.toXDR();
  } catch (error) {
    console.error('Error building create project transaction:', error);
    throw new Error(`Failed to build create project transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build transaction to participate in a project
 * This calls the participate_in_project function on the TokenLaunch contract
 */
export async function buildParticipateTransaction(
  publicKey: string,
  projectId: number,
  starPoints: number,
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<string> {
  if (!TOKEN_LAUNCH_CONTRACT_ID || TOKEN_LAUNCH_CONTRACT_ID.includes('SAMPLE')) {
    throw new Error('Contracts not yet deployed. Please deploy Soroban contracts first.');
  }

  try {
    const account = await server.getAccount(publicKey);
    const contract = new Contract(TOKEN_LAUNCH_CONTRACT_ID);

    const projectIdVal = numberToU64(projectId);
    const participant = nativeToScVal(StellarAddress.fromString(publicKey), { type: 'address' });
    const amount = numberToI128(0); // XLM amount
    const starPointsToUse = numberToI128(starPoints);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase(network),
    })
      .addOperation(
        contract.call(
          'participate_in_project',
          projectIdVal,
          participant,
          amount,
          starPointsToUse
        )
      )
      .setTimeout(180)
      .build();

    const prepared = await server.prepareTransaction(tx);
    return prepared.toXDR();
  } catch (error) {
    console.error('Error building participate transaction:', error);
    throw new Error(`Failed to build participate transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Submit a signed transaction to the network
 */
export async function submitTransaction(signedXDR: string): Promise<{
  hash: string;
  status: string;
}> {
  try {
    const tx = TransactionBuilder.fromXDR(signedXDR, getNetworkPassphrase('testnet'));
    const response = await server.sendTransaction(tx);

    if (response.status === 'PENDING' || response.status === 'DUPLICATE') {
      let result = await server.getTransaction(response.hash);
      
      // Poll for transaction result
      while (result.status === 'NOT_FOUND') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = await server.getTransaction(response.hash);
      }

      if (result.status === 'SUCCESS') {
        return {
          hash: response.hash,
          status: 'success',
        };
      } else {
        throw new Error(`Transaction failed with status: ${result.status}`);
      }
    } else if (response.status === 'ERROR') {
      throw new Error(`Transaction error: ${response.errorResult ? JSON.stringify(response.errorResult) : 'Unknown error'}`);
    }

    return {
      hash: response.hash,
      status: response.status.toLowerCase(),
    };
  } catch (error) {
    console.error('Error submitting transaction:', error);
    throw new Error(`Failed to submit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Query STAR points balance from the contract
 */
export async function getStarPointsBalance(
  walletAddress: string
): Promise<number> {
  if (!TOKEN_LAUNCH_CONTRACT_ID || TOKEN_LAUNCH_CONTRACT_ID.includes('SAMPLE')) {
    return 0;
  }

  try {
    const contract = new Contract(TOKEN_LAUNCH_CONTRACT_ID);
    const user = nativeToScVal(StellarAddress.fromString(walletAddress), { type: 'address' });

    const sourceAccount = await server.getAccount(walletAddress);
    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase('testnet'),
    })
      .addOperation(contract.call('get_star_points', user))
      .setTimeout(180)
      .build();

    const simulated = await server.simulateTransaction(tx);
    
    if ('result' in simulated && simulated.result) {
      const balance = scValToNative(simulated.result.retval);
      return Number(balance) / 10000000; // Convert from 7 decimals
    }

    return 0;
  } catch (error) {
    console.error('Error querying STAR balance:', error);
    return 0;
  }
}

/**
 * Query project data from the contract
 */
export async function getProjectFromChain(
  projectId: number,
  sourceAccount: string
): Promise<any | null> {
  if (!TOKEN_LAUNCH_CONTRACT_ID || TOKEN_LAUNCH_CONTRACT_ID.includes('SAMPLE')) {
    return null;
  }

  try {
    const contract = new Contract(TOKEN_LAUNCH_CONTRACT_ID);
    const projectIdVal = numberToU64(projectId);

    const account = await server.getAccount(sourceAccount);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase('testnet'),
    })
      .addOperation(contract.call('get_project', projectIdVal))
      .setTimeout(180)
      .build();

    const simulated = await server.simulateTransaction(tx);
    
    if ('result' in simulated && simulated.result) {
      const project = scValToNative(simulated.result.retval);
      return project;
    }

    return null;
  } catch (error) {
    console.error('Error querying project:', error);
    return null;
  }
}
