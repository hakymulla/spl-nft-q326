import {
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  assertIsTransactionMessageWithBlockhashLifetime,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signature,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import {
  getInitializeMintInstruction,
  getMintSize,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { getCreateAccountInstruction } from "@solana-program/system";

//import your wallet
import wallet from "../../devnet-wallet.json";

const rpc = createSolanaRpc("https://api.devnet.solana.com");


const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com",
);

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
    const mint = await generateKeyPairSigner();

    const space = BigInt(getMintSize());
    const rent = await rpc.getMinimumBalanceForRentExemption(space).send();
    const{value: latestBlockhash} = await rpc.getLatestBlockhash().send();

    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc, rpcSubscriptions
    });

    const msg = createTransactionMessage({version: 0});

    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);
    const msgWithLifeTime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer
    );


  const txMessage = appendTransactionMessageInstructions(
    [
      getCreateAccountInstruction({
        payer: signer,
        newAccount: mint,
        lamports: rent,
        space,
        programAddress: TOKEN_PROGRAM_ADDRESS,
      }),
      getInitializeMintInstruction({
        mint: mint.address,
        decimals: 6,
        mintAuthority: signer.address,
      }),
    ],
    msgWithLifeTime
  );

  const signedTx = await signTransactionMessageWithSigners(txMessage);
  assertIsTransactionWithBlockhashLifetime(signedTx);

  const signature = getSignatureFromTransaction(signedTx);
  await sendAndConfirm(signedTx, {commitment: "confirmed"});

  console.log(`mint address: ${mint.address}, Transaction SIgnature: ${signature}`);

  } catch (error) {
    console.log(error);
  }
})();
