/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useEffect, useMemo, useState } from "react";
import "./App.css";

import {
  createWeb3Modal,
  defaultConfig,
  useWeb3Modal,
  useWeb3ModalAccount,
  useWeb3ModalProvider,
} from "@web3modal/ethers5/react";
import ABI from "./ABI.json";
import { verificationTypes } from "@swisstronik/sdk/compliance/verificationDetails";
import { encryptDataField } from "@swisstronik/utils";
import { formatAddress, sendShieldedQuery } from "./utils";
import { Contract, providers } from "ethers";

const {
  VITE_CONTRACT_ADDRESS: CONTRACT_ADDRESS,
  VITE_NODE_HTTP_URL: NODE_RPC_URL,
  VITE_WALLETCONNECT_PROJECT_ID: PROJECT_ID,
} = import.meta.env;

const testnet = {
  chainId: 1291,
  name: "Swisstronik Testnet",
  currency: "SWTR",
  explorerUrl: "https://explorer-evm.testnet.swisstronik.com/",
  rpcUrl: NODE_RPC_URL,
};

const metadata = {
  name: "My Website",
  description: "My Website description",
  url: "https://mywebsite.com", // origin must match your domain & subdomain
  icons: ["https://avatars.mywebsite.com/"],
};

const ethersConfig = defaultConfig({
  metadata,
});

createWeb3Modal({
  ethersConfig,
  chains: [testnet],
  projectId: PROJECT_ID,
});

function App() {
  const { open } = useWeb3Modal();
  const { address } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const [imageUrlFromContract, setImageUrlFromContract] = useState("");
  const [imageUrlFromInput, setImageUrlFromInput] = useState("");
  const [hash, setHash] = useState("");
  const [owner, setOwner] = useState("");
  const provider = useMemo(
    () =>
      walletProvider ? new providers.Web3Provider(walletProvider) : undefined,
    [walletProvider]
  );

  const contract = useMemo(
    () =>
      provider ? new Contract(CONTRACT_ADDRESS, ABI, provider) : undefined,
    [provider]
  );

  useEffect(() => {
    (async () => {
      if (!address || !provider || !contract) return;
      try {
        const data = contract.interface.encodeFunctionData("owner");
        const responseMessage = await sendShieldedQuery(
          provider,
          CONTRACT_ADDRESS,
          data as `0x${string}`
        );

        const owner = contract.interface.decodeFunctionResult(
          "owner",
          responseMessage
        )[0];

        setOwner(owner);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [address, provider, contract]);

  const connectWallet = async () => {
    await open();
  };

  const sign = async () => {
    const msgParams = {
      domain: {
        chainId: 1291,
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
    };

    return new Promise<{ signature: string }>((resolve, reject) => {
      walletProvider!.sendAsync!(
        {
          method: "eth_signTypedData_v4",
          params: [address, JSON.stringify(msgParams)],
        },
        (err: any, result: any) => {
          if (err) {
            reject(err);
            return;
          }
          if (result.error) {
            reject(result.error);
            return;
          }

          const signature: string = result.result;

          resolve({
            signature,
          });
        }
      );
    });
  };

  const setImageUrl = async () => {
    if (!imageUrlFromInput) {
      return alert("Please enter an image URL");
    }

    try {
      const data = contract!.interface.encodeFunctionData("setImageUrl", [
        imageUrlFromInput,
      ]);

      const [encryptedData] = await encryptDataField(NODE_RPC_URL, data);


      const signer = provider?.getSigner();

      const tx = await signer?.sendTransaction({
        from: address,
        to: CONTRACT_ADDRESS,
        data: encryptedData,
        gasLimit: 1_000_000,
      });

      console.log("Transaction:", tx);

      setHash(tx?.hash as string);
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

      const data = contract!.interface.encodeFunctionData("getImageUrl", [
        signature,
        issuerAddress,
        verifType,
        adaptType,
      ]);

      const responseMessage = await sendShieldedQuery(
        provider!,
        CONTRACT_ADDRESS,
        data as `0x${string}`
      );

      const imageUrl = contract!.interface.decodeFunctionResult(
        "getImageUrl",
        responseMessage
      )[0];

      setImageUrlFromContract(imageUrl);
    } catch (error: any) {
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
