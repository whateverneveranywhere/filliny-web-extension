import React from 'react';

interface Props {
  width?: number;
  height?: number;
}

function Logo(props: Props) {
  const { height = 40, width = 40 } = props;
  return <img alt="Filliny" width={width} height={height} src={chrome.runtime.getURL('popup/logo.svg')} />;
}

export default Logo;
