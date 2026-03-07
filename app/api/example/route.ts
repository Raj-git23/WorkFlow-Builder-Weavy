import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try{
        const { imageUrl, x, y, width, height } = await req.json();

        if (!imageUrl) {
          return NextResponse.json(
            { error: "imageUrl is required" },
            { status: 400 },
          );
        }

        return NextResponse.json({status: 200}, {statusText: "message received succesfully"})
    } catch (err){
        console.error("Crop route error:", err);
        return NextResponse.json({ 
            error: String(err) 
        }, { 
            status: 500 
        });    
    }
}