export const formatAddress = (addr: string) => {
  return `${addr.substring(0, 7)}...${addr.substring(37)}`;
};
