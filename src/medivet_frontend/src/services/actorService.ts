// src/medivet_frontend/src/services/actorService.ts
import { Actor, Identity, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/medivet_backend/medivet_backend.did.js';

// Store the authenticated actor instance and the identity used to create it
let authenticatedActor: any = null;
let currentIdentity: Identity | null = null;
let currentAgent: HttpAgent | null = null;

// Create and store an authenticated actor
export const createAuthenticatedActor = async (identity: Identity): Promise<any> => {
  try {
    console.log('Creating authenticated actor with identity');
    
    // If we already have an actor with this identity, return it
    if (authenticatedActor && currentIdentity === identity) {
      console.log('Reusing existing authenticated actor');
      return authenticatedActor;
    }
    
    // Create a new actor with the authenticated identity
    const canisterId = import.meta.env.VITE_CANISTER_ID_MEDIVET_BACKEND || 'uxrrr-q7777-77774-qaaaq-cai';
    const host = import.meta.env.VITE_DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943';
    
    console.log('Creating actor with canister ID:', canisterId, 'and host:', host);
    
    // Create the agent with proper configuration
    const agent = new HttpAgent({ 
      identity, 
      host,
    });
    
    // Fetch root key for local development
    if (import.meta.env.VITE_DFX_NETWORK !== 'ic') {
      console.log('Fetching root key for local development');
      try {
        await agent.fetchRootKey();
        console.log('Root key fetched successfully');
      } catch (rootKeyError) {
        console.error('Failed to fetch root key:', rootKeyError);
        throw rootKeyError;
      }
    }
    
    // Store the identity, agent and create a new actor
    currentIdentity = identity;
    currentAgent = agent;
    
    // Create actor using the configured agent
    authenticatedActor = Actor.createActor(idlFactory, {
      agent,
      canisterId
    });
    
    console.log('Authenticated actor created successfully');
    return authenticatedActor;
  } catch (error) {
    console.error('Error creating authenticated actor:', error);
    throw error;
  }
};


// Clear the authenticated actor (e.g., on logout)
export const clearAuthenticatedActor = (): void => {
  authenticatedActor = null;
  currentIdentity = null;
  currentAgent = null;
};
