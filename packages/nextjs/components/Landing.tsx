import { useReducer } from "react";
import { Abi, AbiFunction } from "abitype";
import { DisplayVariable, displayTxResult } from "~~/app/debug/_components/contract";
import { Balance } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

export const Landing: React.FC = ({}) => {
  const [refreshDisplayVariables] = useReducer(value => !value, false);
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");

  if (deployedContractData === undefined || deployedContractLoading) {
    return <div>Loading...</div>;
  }

  const viewFunctions = ((deployedContractData?.abi as Abi).filter(part => part.type === "function") as AbiFunction[])
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

  const basicGetterFn = viewFunctions.find(({ fn }) => fn.name === "getWinner");

  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div className="w-full marquee bg-secondary text-center">
        Sign up and get your avatar in{" "}
        <a
          href="https://biome1.biomes.aw"
          rel="noreferrer"
          target="_blank"
          style={{ textDecoration: "underline", fontWeight: "bolder", color: "white" }}
        >
          Biome-1
        </a>{" "}
        before playing this experience!
      </div>
      <div className="grid grid-cols-12 flex flex-1">
        <div className="col-span-12 lg:col-span-9 p-12 flex flex-col justify-between items-center">
          <div style={{ width: "80%" }}>
            <h1 className="text-3xl font-bold text-left mt-4">Race To The Sky</h1>
            <h1 className="text-left mt-4" style={{ lineHeight: "normal", margin: "0", wordWrap: "break-word" }}>
              First to reach the designated area in the sky wins the ETH!
            </h1>
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
                src="/racetothetopp.png"
                alt="Your Game Image"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
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

          {basicGetterFn && (
            <DisplayVariable
              abi={deployedContractData.abi as Abi}
              abiFunction={basicGetterFn.fn}
              contractAddress={deployedContractData.address}
              key={"getter"}
              refreshDisplayVariables={refreshDisplayVariables}
              inheritedFrom={basicGetterFn.inheritedFrom}
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
