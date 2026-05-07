"use client";

import type * as React from "react";

interface PluggyConnectComponentProps {
  connectToken: string;
  includeSandbox?: boolean;
  onSuccess?: (data: {
    item: { id: string; connector: { id: number; name: string } | null };
  }) => void;
  onError?: (error: { message: string }) => void;
  onClose?: () => void;
}

const PluggyConnect = require("react-pluggy-connect")
  .PluggyConnect as React.FC<PluggyConnectComponentProps>;

export default function PluggyConnectWidget(props: PluggyConnectComponentProps) {
  return <PluggyConnect {...props} />;
}
