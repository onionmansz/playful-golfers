import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://apgumxuibchusxgstugq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZ3VteHVpYmNodXN4Z3N0dWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2Mzc4NDYsImV4cCI6MjA1NDIxMzg0Nn0.A1Ms16TG1Joi1J5UfU-FjfYZOSSLlzmDl-nNJSLMUyU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);