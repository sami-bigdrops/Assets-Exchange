export default function PublisherLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden">{children}</div>
  );
}
