import { NextResponse } from "next/server";
import { RekognitionClient, SearchFacesByImageCommand } from "@aws-sdk/client-rekognition";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REKOGNITION_COLLECTION_ID) {
      return NextResponse.json({ success:false, error:"Face recognition service is not configured." }, { status:503 });
    }
    const body = await request.json();
    const image = String(body.image || "");
    const bytes = Buffer.from(image, "base64");
    if (bytes.length < 1000 || bytes.length > 5 * 1024 * 1024) {
      return NextResponse.json({ success:false, error:"Invalid face image." }, { status:400 });
    }

    const client = new RekognitionClient({ region:process.env.AWS_REGION });
    const result = await client.send(new SearchFacesByImageCommand({
      CollectionId:process.env.AWS_REKOGNITION_COLLECTION_ID,
      Image:{ Bytes:bytes },
      FaceMatchThreshold:Number(process.env.FACE_MATCH_THRESHOLD || 95),
      MaxFaces:2,
      QualityFilter:"AUTO",
    }));
    const match = result.FaceMatches?.[0];
    const employeeId = match?.Face?.ExternalImageId;
    if (!employeeId) return NextResponse.json({ success:true, matched:false, message:"No registered employee face matched." });

    const db = createServiceClient();
    const { data: profile, error } = await db.from("sodah_employee_face_profiles")
      .select("employee_id,employee_name").eq("employee_id", employeeId).maybeSingle();
    if (error) throw error;
    if (!profile) return NextResponse.json({ success:true, matched:false, message:"The matched face has no active employee profile." });
    return NextResponse.json({
      success:true, matched:true,
      employee:{ employeeId:profile.employee_id, name:profile.employee_name },
      similarity:match.Similarity,
    });
  } catch (error) {
    console.error("Face verification error:", error);
    return NextResponse.json({ success:false, error:error.message || "Face verification failed." }, { status:500 });
  }
}
