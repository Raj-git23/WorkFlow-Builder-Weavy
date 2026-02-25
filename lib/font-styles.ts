import { DM_Mono, DM_Sans, Geist, Geist_Mono, Inter, Roboto, Roboto_Mono } from "next/font/google";


export const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

export const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: "--font-inter"
});

export const roboto_mono = Roboto_Mono({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '700'],
    variable: "--font-roboto"
});

export const roboto = Roboto({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '700'],
    variable: "--font-roboto"
});

export const dmSans = DM_Sans({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '700'],
    variable: "--font-dmsans"
});

export const dmMono = DM_Mono({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '300'],
    variable: "--font-dmmono"
});
