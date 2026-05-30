import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'El parámetro "prompt" es obligatorio.' }, { status: 400 });
    }

    // Usar la clave de API segura desde las variables de entorno
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clave de API de Gemini (API_KEY) no configurada en las variables de entorno del servidor.' },
        { status: 500 }
      );
    }

    // Realizar la llamada HTTP directa a la API oficial de Gemini de Google
    // Usamos el modelo gemini-2.5-flash como se recomienda por velocidad y calidad
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error desde la API de Gemini:', errorText);
      return NextResponse.json(
        { error: `Error devuelto por la API de Google Gemini (código ${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return NextResponse.json(
        { error: 'La respuesta de Gemini no contiene texto válido.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ text: resultText });
  } catch (error: any) {
    console.error('Error en el endpoint de Gemini:', error);
    return NextResponse.json(
      { error: error.message || 'Ocurrió un error interno en el servidor al procesar la petición.' },
      { status: 500 }
    );
  }
}
