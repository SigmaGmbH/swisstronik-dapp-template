/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useEffect, useState } from "react";
import "./App.css";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount, useConfig } from "wagmi";
import { decodeAbiParameters, encodeFunctionData } from "viem";
import ABI from "./ABI.json";
import { formatAddress, sendShieldedQuery } from "./utils";
import { encryptDataField } from "@swisstronik/utils";
import { verificationTypes } from "@swisstronik/sdk/compliance/verificationDetails";
import { signTypedData, sendTransaction } from "@wagmi/core";
import { waitForTransactionReceipt } from "viem/actions";

const { VITE_CONTRACT_ADDRESS: CONTRACT_ADDRESS } = import.meta.env;

function App() {
  const { open } = useWeb3Modal();
  const { address } = useAccount();
  const [imageUrlFromContract, setImageUrlFromContract] = useState("");
  const [imageUrlFromInput, setImageUrlFromInput] = useState("");
  const [hash, setHash] = useState("");
  const [owner, setOwner] = useState("");
  const config = useConfig();

  useEffect(() => {
    (async () => {
      if (!address || !config) return;
      try {
        const data = encodeFunctionData({
          abi: ABI,
          functionName: "owner",
        });

        const responseMessage = await sendShieldedQuery(
          config,
          CONTRACT_ADDRESS,
          data
        );

        const owner: string = decodeAbiParameters(
          (ABI as any).find((x: any) => x.name === "owner")?.outputs,
          responseMessage
        )[0];

        setOwner(owner as string);
      } catch (error) {
        console.log(error);
      }
    })();
  }, [address, config]);

  const connectWallet = async () => {
    await open();
  };

  const sign = async () => {
    const signature = await signTypedData(config, {
      domain: {
        chainId: BigInt(1291),
        name: "Sample Dapp",
        verifyingContract: CONTRACT_ADDRESS,
        version: "1",
      },
      message: {
        contents: "Sample Verification",
      },
      primaryType: "Obj",
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Obj: [{ name: "contents", type: "string" }],
      },
    });
    return { signature };
  };

  const setImageUrl = async () => {
    if (!imageUrlFromInput) {
      return alert("Please enter an image URL");
    }

    try {
      const data = encodeFunctionData({
        abi: ABI,
        functionName: "setImageUrl",
        args: [imageUrlFromInput],
      });

      const client = config.getClient();

      const nodeRpcUrl: string = client.transport.url;

      const [encryptedData] = await encryptDataField(nodeRpcUrl, data);

      const hash = await sendTransaction(config, {
        account: address!,
        to: CONTRACT_ADDRESS,
        data: encryptedData as `0x${string}`,
        gas: BigInt(1_000_000),
      });

      const receipt = await waitForTransactionReceipt(client, { hash });

      console.log("Transaction receipt:", receipt);

      setHash(hash);
    } catch (error) {
      console.error(error);
    }
  };

  const getImageUrl = async (
    signature: string,
    issuerAddress: string,
    verificationType: (typeof verificationTypes)[number],
    adapterType: "Quadrata" | "WorldCoin"
  ) => {
    try {
      const verifType = verificationTypes.indexOf(verificationType);
      const adaptType = ["Quadrata", "WorldCoin"].indexOf(adapterType);

      if (verifType === -1) {
        return alert("Invalid verification type");
      }

      if (adaptType === -1) {
        return alert("Invalid adapter type");
      }

      const data = encodeFunctionData({
        abi: ABI,
        functionName: "getImageUrl",
        args: [signature, issuerAddress, verifType, adaptType],
      });

      const responseMessage = await sendShieldedQuery(
        config,
        CONTRACT_ADDRESS,
        data
      );

      const imageUrl: string = decodeAbiParameters(
        (ABI as any).find((x: any) => x.name === "getImageUrl")?.outputs,
        responseMessage
      )[0];

      setImageUrlFromContract(imageUrl);
    } catch (error) {
      console.error(error);
    }
  };

  const generateSignature = async (adapterType: "Quadrata" | "WorldCoin") => {
    const { signature } = await sign();
    console.log("Signature:", signature);

    let issuerAddress = "";

    if (adapterType === "Quadrata") {
      issuerAddress = "0x971CD375a8799ca7F2366104e117C5497243C478"; //quadrata
    } else if (adapterType === "WorldCoin") {
      issuerAddress = "0x5563712d4923E3220cF94D53dD2f9765969dBac3"; //worldcoin
    }
    const verificationType = "VT_KYC";

    await getImageUrl(signature, issuerAddress, verificationType, adapterType);
  };

  return (
    <>
      <div className="card">
        <button onClick={connectWallet}>WalletConnect</button>
        <br />
        <br />
        {address && (
          <>
            <p>Connected account: {formatAddress(address)}</p>
          </>
        )}

        {hash && (
          <p>
            Transaction hash:
            <a
              href={`https://explorer-evm.testnet.swisstronik.com/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              {formatAddress(hash)}
            </a>
          </p>
        )}

        {owner?.toLowerCase() === address?.toLowerCase() && (
          <div>
            <p>Set Image URL in Contract</p>
            <input
              type="url"
              placeholder="Image URL"
              value={imageUrlFromInput}
              onChange={(e) => setImageUrlFromInput(e.target.value)}
            />
            <button onClick={setImageUrl}>Set Image URL</button>
            <br />
            <br />
          </div>
        )}

        {!imageUrlFromContract && (
          <>
            <button onClick={() => generateSignature("Quadrata")}>
              Generate Signature to get Image with Quadrata
            </button>
            <br />
            <br />
            <button onClick={() => generateSignature("WorldCoin")}>
              Generate Signature to get Image with WorldCoin
            </button>
          </>
        )}

        {imageUrlFromContract && (
          <>
            <p>Image from Contract</p>
            <img
              src={imageUrlFromContract}
              style={{ maxWidth: "200px" }}
              alt="Sample"
            />
          </>
        )}
      </div>
    </>
  );
}

export default App;
