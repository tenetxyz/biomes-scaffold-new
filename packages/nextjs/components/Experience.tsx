import { useReducer } from "react";
import { Abi, AbiFunction } from "abitype";
import { useAccount } from "wagmi";
import { DisplayVariable, displayTxResult } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

export const Experience: React.FC = ({}) => {
  const { address: connectedAddress } = useAccount();
  const [refreshDisplayVariables] = useReducer(value => !value, false);
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Experience");

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

  const getAllowedPlayers = viewFunctions.find(({ fn }) => fn.name === "getAllowedPlayers");

  if (getAllowedPlayers === undefined) {
    return <div>Missing required functions</div>;
  }

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
              <h1 className="text-3xl font-bold text-left mt-4">Location Guard Service</h1>
              <h1 className="text-left mt-4" style={{ lineHeight: "normal", margin: "0", wordWrap: "break-word" }}>
                Will move when you&apos;re near it, and move back once you&apos;re away from it
              </h1>
            </div>
            <div>
              <DisplayVariable
                abi={deployedContractData.abi as Abi}
                abiFunction={getAllowedPlayers.fn}
                contractAddress={deployedContractData.address}
                key={"getAllowedPlayers"}
                refreshDisplayVariables={refreshDisplayVariables}
                inheritedFrom={getAllowedPlayers.inheritedFrom}
                poll={2000}
              >
                {({ result, RefreshButton }) => {
                  // if (isFetching) return <div>Loading...</div>;

                  return (
                    <div style={{ backgroundColor: "#160b21", padding: "16px", border: "1px solid #0e0715" }}>
                      <div className="flex justify-between mb-4">
                        <div className="text-lg font-medium">Players Allowed To Move Past Guard</div>
                        <div className="flex gap-4">{RefreshButton}</div>
                      </div>
                      {displayTxResult(result)}
                    </div>
                  );
                }}
              </DisplayVariable>
            </div>
          </div>
        </div>
        <div
          className="col-span-12 lg:col-span-3 p-12"
          style={{ backgroundColor: "#160b21", borderLeft: "1px solid #0e0715" }}
        ></div>
      </div>
    </div>
  );
};
