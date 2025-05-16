declare global {
  interface Window {
    refetchBalance?: () => void;
  }
}

export {}