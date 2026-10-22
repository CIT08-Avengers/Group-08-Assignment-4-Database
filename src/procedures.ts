// Part B2 and B3 - calling what you wrote in the database
//
// Write the routines in procedures.sql first, in pgAdmin. Calling them is an
// ordinary query: a FUNCTION goes inside a SELECT, a PROCEDURE uses CALL.

import { DatabaseError } from 'pg';
import { pool } from './db.js';

export interface TranscriptRow {
  courseId: string;
  title: string;
  grade: string | null;
}

/**
 * The transcript of a student, from the stored function:
 *
 *     SELECT * FROM student_transcript($1)
 *
 * The function raises an exception for an unknown student, which arrives
 * here as a rejected promise. Let it travel on: this one throws.
 */
export async function transcriptOf(studentId: string): Promise<TranscriptRow[]> {
    const { rows } = await pool.query('select course_id, title, grade from student_transcript($1)', [studentId]);
    return rows;
}

/**
 * The same, but undefined instead of an error when the student does not
 * exist.
 *
 * An exception you raised yourself arrives with err.code === 'P0001'. Any
 * other code is a real failure and must be re-thrown rather than swallowed:
 * a syntax error in your SQL is not "no such student".
 */
export async function transcriptOrUndefined(
  studentId: string): Promise<TranscriptRow[] | undefined> {
  try {
    const { rows } = await pool.query('select course_id, title, grade from student_transcript($1)', [studentId]);
    return rows;
    
  } catch (err) {
    if (err instanceof DatabaseError && err.code === 'P0001') {
      return undefined;
    }
    throw err;
  }
}

/**
 * Enrols a student by calling the stored procedure:
 *
 *     CALL enrol_student($1, $2, $3, $4, $5, NULL)
 *
 * The INOUT parameter comes back as a row. Note that tot_cred is numeric, so
 * the new total arrives as a string: convert it.
 *
 * Returns the new credit total.
 */
export async function enrolWithProcedure(
  studentId: string, courseId: string, secId: string,
  semester: string, year: number): Promise<number> {
  const { rows } = await pool.query<{ new_total: string }>('call enrol_student($1, $2, $3, $4, $5, null)', [studentId, courseId, secId, semester, year]);
  return parseFloat(rows[0].new_total);
}

/*
Question:
  You have now written the same enrolment twice, once in TypeScript (B1) and once in the database (B3).
  What does each version give you, what does it cost, and where would you put it in a system you had to maintain? 
*/

/* Answer: 
  Writing the function of enrolling a student in TypeScript makes it simpler to maintaing because debugging would be easier.
  However writing the logic inside the database could make it more reusable if multiple applications depend on this procedure.
  In our scenario we prefer writing the logic inside TypeScript due to maintanability and the size our app.
  Tradeoffs is that we have to make the transaction atomic manually where as a procedure already is atomic.
*/