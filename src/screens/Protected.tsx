import { type FC } from "react";

const Protected: FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto p-2">
      <h1 className="text-2xl">Protected Page</h1>
      <p>This page should only be visible to authenticated users.</p>
    </div>
  );
};

export default Protected;
