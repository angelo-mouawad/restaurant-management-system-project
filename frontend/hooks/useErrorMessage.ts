import { Dispatch, SetStateAction, useState } from "react";

type UseErrorMessageResult = [string, Dispatch<SetStateAction<string>>];

const useErrorMessage = (initialValue = ""): UseErrorMessageResult => {
  return useState<string>(initialValue);
};

export default useErrorMessage;
