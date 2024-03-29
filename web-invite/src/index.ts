/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import handleProxy from './proxy';
import handleRedirect from './redirect';
import apiRouter from './router';

// Export a default object containing event handlers
export default {
	// The fetch handler is invoked when this worker receives a HTTP(S) request
	// and should return a Response (optionally wrapped in a Promise)
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// You'll find it helpful to parse the request.url string into a URL object. Learn more at https://developer.mozilla.org/en-US/docs/Web/API/URL
		const url = new URL(request.url);

		// You can get pretty far with simple logic like if/switch-statements
		switch (url.pathname) {
			case '/invite':
				// return handleRedirect.fetch(request, env, ctx);
				return Response.redirect('https://discord.com/oauth2/authorize?client_id=888265957485719554&scope=bot&permissions=10737418248', 302);

			// case '/proxy':
			// 	return handleProxy.fetch(request, env, ctx);
		}

		// if (url.pathname.startsWith('/api/')) {
		// 	// You can also use more robust routing
		// 	return apiRouter.handle(request);
		// }

		return new Response(
			`Hello from Paimon`,
			{ headers: { 'Content-Type': 'text/html' } }
		);
	},
};
