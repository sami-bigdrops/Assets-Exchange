export default function PublisherLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="h-screen overflow-y-auto">{children}</div>;
}
