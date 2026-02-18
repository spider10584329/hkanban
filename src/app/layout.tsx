import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
}

export const metadata: Metadata = {
	title: "Kanban - Sign In",
	description: "Kanban cleaning circuit management platform",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className="antialiased"
			>
				<ToastProvider>
					<AuthProvider>
						{children}
					</AuthProvider>
				</ToastProvider>
			</body>
		</html>
	);
}
