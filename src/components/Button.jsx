import { useState } from "react";

function Button(props) {
    // This is a simple button component

    const [label, setLabel] = useState("Click here");

    function changeLabel (){
        setLabel("Clicked!");
    }
  return (
    <button className="m-4 p-2 border rounded bg-red-600" onClick={changeLabel}>{label}</button>
  )
}

export default Button