import { useReducer } from "react";
import { Abi, AbiFunction } from "abitype";
import { useAccount } from "wagmi";
import { DisplayVariable, displayTxResult } from "~~/app/debug/_components/contract";
import { Balance } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

export const Game: React.FC = ({}) => {
  const { address: connectedAddress } = useAccount();
  const [refreshDisplayVariables] = useReducer(value => !value, false);
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");

  if (connectedAddress === undefined) {
    return <div>Connect your wallet to continue</div>;
  }

  if (deployedContractData === undefined || deployedContractLoading) {
    return <div>Loading...</div>;
  }

  const viewFunctions = ((deployedContractData.abi as Abi).filter(part => part.type === "function") as AbiFunction[])
    .filter(fn => {
      const isQueryableWithNoParams =
        (fn.stateMutability === "view" || fn.stateMutability === "pure") && fn.inputs.length === 0;
      return isQueryableWithNoParams;
    })
    .map(fn => {
      return {
        fn,
        inheritedFrom: ((deployedContractData as GenericContract)?.inheritedFunctions as InheritedFunctions)?.[fn.name],
      };
    })
    .sort((a, b) => (b.inheritedFrom ? b.inheritedFrom.localeCompare(a.inheritedFrom) : 1));

  const getWinnerFn = viewFunctions.find(({ fn }) => fn.name === "getWinner");

  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div className="w-full marquee bg-secondary text-center flex justify-between px-12 items-center">
        <div>
          Play in{" "}
          <a
            href="https://biome1.biomes.aw/"
            rel="noreferrer"
            target="_blank"
            style={{ textDecoration: "underline", fontWeight: "bolder", color: "white" }}
          >
            Biomes
          </a>{" "}
          and move your avatar to the red cube to win the eth!
        </div>
        <div>
          <a
            href="/how-to-play"
            className="flex items-center bg-white/10 border border-white/20 px-2 py-1.5 font-mono uppercase text-sm leading-none transition hover:border-white"
          >
            How To Play
          </a>
        </div>
      </div>

      <div className="grid grid-cols-12 flex flex-1">
        <div className="col-span-12 lg:col-span-9 p-12 flex flex-col justify-between items-center">
          <div style={{ width: "80%" }} className="flex flex-col gap-12">
            <div>
              <h1 className="text-3xl font-bold text-left mt-4">You Are In!</h1>
              <h1 className="text-left mt-4" style={{ lineHeight: "normal", margin: "0", wordWrap: "break-word" }}>
                First one to get their avatar to enter the designated area in the sky wins the eth!
              </h1>
            </div>
            <div
              style={{
                border: "1px solid white",
                width: "100%",
                height: "500px", // Adjust the height as needed
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#000", // Optional: Background color
              }}
              className="mt-4"
            >
              <img
                src="/racetothetop.png"
                alt="Your Game Image"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            <div></div>
          </div>
        </div>
        <div
          className="col-span-12 lg:col-span-3 p-12"
          style={{ backgroundColor: "#160b21", borderLeft: "1px solid #0e0715" }}
        >
          <div
            className="p-6 text-white text-center border border- border-white w-full mb-4"
            style={{ backgroundColor: "#42a232" }}
          >
            <div className="text-lg font-bold flex justify-center items-center flex justify-center align-center items-center">
              <span>Prize:</span>
            </div>
            <div className="my-4 mt-8" style={{ textAlign: "-webkit-center" }}>
              <Balance
                address={deployedContractData.address}
                className="px-0 h-1.5 min-h-[0.375rem] text-4xl text-center"
              />
            </div>
          </div>

          {getWinnerFn && (
            <DisplayVariable
              abi={deployedContractData.abi as Abi}
              abiFunction={getWinnerFn.fn}
              contractAddress={deployedContractData.address}
              key={"getter"}
              refreshDisplayVariables={refreshDisplayVariables}
              inheritedFrom={getWinnerFn.inheritedFrom}
              poll={10000}
            >
              {({ result, RefreshButton }) => {
                return (
                  <div
                    className="p-6 text-white text-center border border-white w-full"
                    style={{ backgroundColor: "#42a232" }}
                  >
                    <div className="text-lg font-bold flex justify-center items-center">
                      <span>Winner:</span> <span>{RefreshButton}</span>
                    </div>
                    <div className="text-3xl my-4 text-center">
                      {result === "0x0000000000000000000000000000000000000000" ? "None Yet" : displayTxResult(result)}
                    </div>
                  </div>
                );
              }}
            </DisplayVariable>
          )}
        </div>
      </div>
    </div>
  );
};
