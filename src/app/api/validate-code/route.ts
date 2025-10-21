'use server';

import { NextResponse } from 'next/server';
import { validateAndUseCode } from '@/lib/codes';

export async function POST(request: Request) {
    try {
        const { code, username } = await request.json();

        if (!code || !username) {
            return NextResponse.json({ error: 'El código y el nombre de usuario son requeridos.' }, { status: 400 });
        }

        const result = await validateAndUseCode(code, username);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Código validado y utilizado con éxito.' });

    } catch (error) {
        console.error('Error validating code:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
