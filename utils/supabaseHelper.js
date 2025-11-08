// import { supabase } from '../config/supabase.js';

// /**
//  * Helper functions để làm việc với Supabase
//  * Thay thế cho Mongoose operations
//  */

// /**
//  * Insert một record vào table
//  * @param {string} table - Tên table
//  * @param {object} data - Dữ liệu cần insert
//  * @returns {Promise<{data: any, error: any}>}
//  */
// export const insertOne = async (table, data) => {
//    const { data: result, error } = await supabase
//       .from(table)
//       .insert(data)
//       .select()
//       .single();
   
//    return { data: result, error };
// };

// /**
//  * Insert nhiều records vào table
//  * @param {string} table - Tên table
//  * @param {array} data - Mảng dữ liệu cần insert
//  * @returns {Promise<{data: any[], error: any}>}
//  */
// export const insertMany = async (table, data) => {
//    const { data: result, error } = await supabase
//       .from(table)
//       .insert(data)
//       .select();
   
//    return { data: result, error };
// };

// /**
//  * Tìm một record theo ID
//  * @param {string} table - Tên table
//  * @param {string} id} - ID của record
//  * @param {string} select - Columns to select (default: '*')
//  * @returns {Promise<{data: any, error: any}>}
//  */
// export const findById = async (table, id, select = '*') => {
//    const { data, error } = await supabase
//       .from(table)
//       .select(select)
//       .eq('id', id)
//       .single();
   
//    return { data, error };
// };

// /**
//  * Tìm records theo điều kiện
//  * @param {string} table - Tên table
//  * @param {object} filters - Điều kiện filter (ví dụ: { status: 'Active', userId: '123' })
//  * @param {object} options - Options (limit, orderBy, etc.)
//  * @returns {Promise<{data: any[], error: any}>}
//  */
// export const find = async (table, filters = {}, options = {}) => {
//    let query = supabase.from(table).select('*');
   
//    // Apply filters
//    Object.entries(filters).forEach(([key, value]) => {
//       if (value !== undefined && value !== null) {
//          query = query.eq(key, value);
//       }
//    });
   
//    // Apply options
//    if (options.orderBy) {
//       query = query.order(options.orderBy, { ascending: options.ascending !== false });
//    }
   
//    if (options.limit) {
//       query = query.limit(options.limit);
//    }
   
//    if (options.offset) {
//       query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
//    }
   
//    const { data, error } = await query;
   
//    return { data, error };
// };

// /**
//  * Tìm một record theo điều kiện
//  * @param {string} table - Tên table
//  * @param {object} filters - Điều kiện filter
//  * @returns {Promise<{data: any, error: any}>}
//  */
// export const findOne = async (table, filters = {}) => {
//    let query = supabase.from(table).select('*');
   
//    Object.entries(filters).forEach(([key, value]) => {
//       if (value !== undefined && value !== null) {
//          query = query.eq(key, value);
//       }
//    });
   
//    const { data, error } = await query.limit(1).single();
   
//    return { data, error };
// };

// /**
//  * Update một record theo ID
//  * @param {string} table - Tên table
//  * @param {string} id - ID của record
//  * @param {object} updates - Dữ liệu cần update
//  * @returns {Promise<{data: any, error: any}>}
//  */
// export const updateById = async (table, id, updates) => {
//    const { data, error } = await supabase
//       .from(table)
//       .update(updates)
//       .eq('id', id)
//       .select()
//       .single();
   
//    return { data, error };
// };

// /**
//  * Update nhiều records theo điều kiện
//  * @param {string} table - Tên table
//  * @param {object} filters - Điều kiện filter
//  * @param {object} updates - Dữ liệu cần update
//  * @returns {Promise<{data: any[], error: any}>}
//  */
// export const updateMany = async (table, filters, updates) => {
//    let query = supabase.from(table).update(updates);
   
//    Object.entries(filters).forEach(([key, value]) => {
//       if (value !== undefined && value !== null) {
//          query = query.eq(key, value);
//       }
//    });
   
//    const { data, error } = await query.select();
   
//    return { data, error };
// };

// /**
//  * Delete một record theo ID
//  * @param {string} table - Tên table
//  * @param {string} id - ID của record
//  * @returns {Promise<{data: any, error: any}>}
//  */
// export const deleteById = async (table, id) => {
//    const { data, error } = await supabase
//       .from(table)
//       .delete()
//       .eq('id', id)
//       .select()
//       .single();
   
//    return { data, error };
// };

// /**
//  * Delete nhiều records theo điều kiện
//  * @param {string} table - Tên table
//  * @param {object} filters - Điều kiện filter
//  * @returns {Promise<{data: any[], error: any}>}
//  */
// export const deleteMany = async (table, filters) => {
//    let query = supabase.from(table).delete();
   
//    Object.entries(filters).forEach(([key, value]) => {
//       if (value !== undefined && value !== null) {
//          query = query.eq(key, value);
//       }
//    });
   
//    const { data, error } = await query.select();
   
//    return { data, error };
// };

// /**
//  * Count records theo điều kiện
//  * @param {string} table - Tên table
//  * @param {object} filters - Điều kiện filter
//  * @returns {Promise<{count: number, error: any}>}
//  */
// export const count = async (table, filters = {}) => {
//    let query = supabase.from(table).select('*', { count: 'exact', head: true });
   
//    Object.entries(filters).forEach(([key, value]) => {
//       if (value !== undefined && value !== null) {
//          query = query.eq(key, value);
//       }
//    });
   
//    const { count, error } = await query;
   
//    return { count: count || 0, error };
// };

// /**
//  * Execute raw SQL query (nếu cần)
//  * Lưu ý: Supabase không hỗ trợ raw SQL trực tiếp qua client
//  * Cần dùng RPC functions hoặc PostgREST API
//  */
// export const rawQuery = async (rpcFunction, params = {}) => {
//    const { data, error } = await supabase.rpc(rpcFunction, params);
//    return { data, error };
// };

// export default {
//    insertOne,
//    insertMany,
//    findById,
//    find,
//    findOne,
//    updateById,
//    updateMany,
//    deleteById,
//    deleteMany,
//    count,
//    rawQuery
// };

