// Part B1 - one operation, two statements, one transaction

import { pool } from './db.js';

export interface EnrolInput {
  studentId: string;
  courseId: string;
  secId: string;
  semester: string;
  year: number;
}

/**
 * Enrols a student in a course section and adds the course credits to the
 * student's total.
 *
 * Two statements:
 *   INSERT INTO takes (id, course_id, sec_id, semester, year, grade)
 *     VALUES ($1, $2, $3, $4, $5, NULL)
 *   UPDATE student SET tot_cred = tot_cred + <the course credits>
 *     WHERE id = $1
 *
 * They must both happen or neither. A student enrolled without the credits
 * being added is a database that quietly disagrees with itself.
 *
 * A transaction runs on one connection, so take a client from the pool
 * rather than using the pool directly: BEGIN, both statements, COMMIT, and
 * ROLLBACK if anything fails. Release the client in a finally block.
 *
 * Returns the student's new credit total.
 */
export async function enrolInTypeScript(input: EnrolInput): Promise<number> {
  const {studentId, courseId, secId, semester, year} = input;
  
  const client = await pool.connect();
  
  try {
    await client.query('begin');
    await client.query('insert into takes (id, course_id, sec_id, semester, year, grade) values ($1, $2, $3, $4, $5, null)', [studentId, courseId, secId, semester, year]);
    const result = await pool.query<{totCred: number}>(
      `update student SET tot_cred = tot_cred
      + (select credits FROM course c where c.course_id = $1)
      where id = $2 returning tot_cred::int "totCred"`, [courseId, studentId]);
    return result.rows[0].totCred;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}
