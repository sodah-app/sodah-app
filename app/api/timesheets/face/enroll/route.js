import { NextResponse } from "next/server";
import {
  CreateCollectionCommand,
  IndexFacesCommand,
} from "@aws-sdk/client-rekognition";
import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const region = process.env.AWS_REGION;
function rekognition() {
  if (!region || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS Rekognition is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.");
  }
  return new RekognitionClient({ region });
}
function collectionId() {
  const id = process.env.AWS_REKOGNITION_COLLECTION_ID;
  if (!id) throw new Error("AWS_REKOGNITION_COLLECTION_ID is not configured.");
  return id;
}

export async function POST(request) {
  try {
    // Enrollment is admin-only: require a valid Supabase Auth session.
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return NextResponse.json({ success:false, error:"Administrator sign-in required." }, { status:401 });

    const body = await request.json();
    const image = String(body.image || "");
    const employeeId = String(body.employee?.employeeId || "").trim();
    const name = String(body.employee?.name || "").trim();
    if (!body.consent || !employeeId || !name || !image) {
      return NextResponse.json({ success:false, error:"Employee name, employee ID, face image and informed consent are required." }, { status:400 });
    }
    const bytes = Buffer.from(image, "base64");
    if (bytes.length < 1000 || bytes.length > 5 * 1024 * 1024) {
      return NextResponse.json({ success:false, error:"The captured face image is invalid or exceeds 5 MB." }, { status:400 });
    }

    const db = createServiceClient();
    const { data: existing, error: lookupError } = await db
      .from("sodah_employee_face_profiles").select("employee_id")
      .eq("employee_id", employeeId).maybeSingle();
    if (lookupError) throw lookupError;

    const client = rekognition();
    const collection = collectionId();
    try {
      await client.send(new CreateCollectionCommand({ CollectionId: collection }));
    } catch (e) {
      if (e.name !== "ResourceAlreadyExistsException") throw e;
    }

    // Remove previous indexed face for this employee before replacing enrollment.
    if (existing) {
      const { data: old } = await db.from("sodah_employee_face_profiles")
        .select("face_id").eq("employee_id", employeeId).maybeSingle();
      if (old?.face_id) {
        const { DeleteFacesCommand } = await import("@aws-sdk/client-rekognition");
        await client.send(new DeleteFacesCommand({ CollectionId: collection, FaceIds:[old.face_id] }));
      }
    }

    const indexed = await client.send(new IndexFacesCommand({
      CollectionId: collection,
      Image: { Bytes: bytes },
      ExternalImageId: employeeId,
      MaxFaces: 1,
      QualityFilter: "AUTO",
      DetectionAttributes: ["DEFAULT"],
    }));
    const face = indexed.FaceRecords?.[0]?.Face;
    if (!face?.FaceId) {
      return NextResponse.json({ success:false, error:"No clear face was detected. Ensure one employee is centered, well lit and facing the camera." }, { status:422 });
    }

    const { error: saveError } = await db.from("sodah_employee_face_profiles").upsert({
      employee_id: employeeId,
      employee_name: name,
      face_id: face.FaceId,
      consent_recorded_at: new Date().toISOString(),
      enrolled_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict:"employee_id" });
    if (saveError) {
      const { DeleteFacesCommand } = await import("@aws-sdk/client-rekognition");
      await client.send(new DeleteFacesCommand({ CollectionId:collection, FaceIds:[face.FaceId] }));
      throw saveError;
    }
    return NextResponse.json({ success:true, message:`Face profile saved for ${name}.` });
  } catch (error) {
    console.error("Face enrollment error:", error);
    return NextResponse.json({ success:false, error:error.message || "Face enrollment failed." }, { status:500 });
  }
}
