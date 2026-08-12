const MockTest        = require('../models/MockTest');
const MockTestAttempt = require('../models/MockTestAttempt');
const automation      = require('../automation/automationService');

// Seed data — enough tests to demonstrate the full subject/difficulty
// matrix. Questions are intentionally kept to 5 per test so the seed is
// concise; add more per test as needed.
const SEED_TESTS = [
  {
    title: 'Java Fundamentals - Easy',
    subject: 'Java',
    topic: 'Fundamentals',
    difficulty: 'Easy',
    durationMinutes: 15,
    questions: [
      {
        questionText: 'Which keyword is used to define a class in Java?',
        options: [{ label: 'A', text: 'class' }, { label: 'B', text: 'Class' }, { label: 'C', text: 'define' }, { label: 'D', text: 'object' }],
        correctOption: 'A',
        explanation: 'The "class" keyword (lowercase) is used to declare a class in Java.',
      },
      {
        questionText: 'What is the size of an int in Java?',
        options: [{ label: 'A', text: '8 bits' }, { label: 'B', text: '16 bits' }, { label: 'C', text: '32 bits' }, { label: 'D', text: '64 bits' }],
        correctOption: 'C',
        explanation: 'int in Java is always 32 bits (4 bytes), regardless of platform.',
      },
      {
        questionText: 'Which of the following is NOT a Java primitive type?',
        options: [{ label: 'A', text: 'int' }, { label: 'B', text: 'boolean' }, { label: 'C', text: 'String' }, { label: 'D', text: 'char' }],
        correctOption: 'C',
        explanation: 'String is a class in Java, not a primitive type.',
      },
      {
        questionText: 'What does JVM stand for?',
        options: [{ label: 'A', text: 'Java Virtual Machine' }, { label: 'B', text: 'Java Variable Method' }, { label: 'C', text: 'Java Verified Module' }, { label: 'D', text: 'Joint Virtual Memory' }],
        correctOption: 'A',
        explanation: 'JVM stands for Java Virtual Machine — it executes Java bytecode.',
      },
      {
        questionText: 'Which method is the entry point of a Java application?',
        options: [{ label: 'A', text: 'start()' }, { label: 'B', text: 'run()' }, { label: 'C', text: 'main()' }, { label: 'D', text: 'init()' }],
        correctOption: 'C',
        explanation: 'public static void main(String[] args) is the entry point of every Java application.',
      },
    ],
  },
  {
    title: 'Java OOP - Medium',
    subject: 'Java',
    topic: 'OOP',
    difficulty: 'Medium',
    durationMinutes: 20,
    questions: [
      {
        questionText: 'Which OOP principle hides internal implementation details?',
        options: [{ label: 'A', text: 'Inheritance' }, { label: 'B', text: 'Polymorphism' }, { label: 'C', text: 'Encapsulation' }, { label: 'D', text: 'Abstraction' }],
        correctOption: 'C',
        explanation: 'Encapsulation bundles data and methods and restricts direct access to internal state.',
      },
      {
        questionText: 'What is method overriding?',
        options: [{ label: 'A', text: 'Defining two methods with the same name but different parameters in the same class' }, { label: 'B', text: 'Redefining a parent class method in a subclass with the same signature' }, { label: 'C', text: 'Calling a method using an object reference' }, { label: 'D', text: 'Creating multiple constructors' }],
        correctOption: 'B',
        explanation: 'Method overriding allows a subclass to provide a specific implementation of a method already defined in its superclass.',
      },
      {
        questionText: 'Which keyword prevents a class from being subclassed?',
        options: [{ label: 'A', text: 'static' }, { label: 'B', text: 'abstract' }, { label: 'C', text: 'private' }, { label: 'D', text: 'final' }],
        correctOption: 'D',
        explanation: 'The final keyword prevents a class from being extended.',
      },
      {
        questionText: 'What is an abstract class?',
        options: [{ label: 'A', text: 'A class with no methods' }, { label: 'B', text: 'A class that cannot be instantiated and may contain abstract methods' }, { label: 'C', text: 'A class with only static methods' }, { label: 'D', text: 'A class with private constructors' }],
        correctOption: 'B',
        explanation: 'Abstract classes cannot be instantiated directly and can have both abstract (no body) and concrete methods.',
      },
      {
        questionText: 'How many interfaces can a Java class implement?',
        options: [{ label: 'A', text: 'Only one' }, { label: 'B', text: 'Maximum two' }, { label: 'C', text: 'Maximum five' }, { label: 'D', text: 'Any number' }],
        correctOption: 'D',
        explanation: 'A Java class can implement any number of interfaces, providing a form of multiple inheritance.',
      },
    ],
  },
  {
    title: 'Data Structures - Easy',
    subject: 'Data Structures',
    topic: 'Arrays & LinkedLists',
    difficulty: 'Easy',
    durationMinutes: 15,
    questions: [
      {
        questionText: 'What is the time complexity of accessing an element in an array by index?',
        options: [{ label: 'A', text: 'O(n)' }, { label: 'B', text: 'O(log n)' }, { label: 'C', text: 'O(1)' }, { label: 'D', text: 'O(n²)' }],
        correctOption: 'C',
        explanation: 'Arrays support O(1) random access because elements are stored at contiguous memory addresses.',
      },
      {
        questionText: 'Which data structure follows LIFO order?',
        options: [{ label: 'A', text: 'Queue' }, { label: 'B', text: 'Stack' }, { label: 'C', text: 'Array' }, { label: 'D', text: 'Linked List' }],
        correctOption: 'B',
        explanation: 'Stack follows Last In First Out (LIFO). The last element pushed is the first popped.',
      },
      {
        questionText: 'What is the main advantage of a Linked List over an Array?',
        options: [{ label: 'A', text: 'Faster random access' }, { label: 'B', text: 'Dynamic size and O(1) insertion at head' }, { label: 'C', text: 'Less memory usage' }, { label: 'D', text: 'Cache-friendly memory layout' }],
        correctOption: 'B',
        explanation: 'Linked lists can grow dynamically and support O(1) insertion at the head without shifting elements.',
      },
      {
        questionText: 'Which data structure is used for BFS?',
        options: [{ label: 'A', text: 'Stack' }, { label: 'B', text: 'Tree' }, { label: 'C', text: 'Queue' }, { label: 'D', text: 'Hash Map' }],
        correctOption: 'C',
        explanation: 'Breadth-First Search (BFS) uses a Queue to visit nodes level by level.',
      },
      {
        questionText: 'What is the time complexity of searching in an unsorted array?',
        options: [{ label: 'A', text: 'O(1)' }, { label: 'B', text: 'O(log n)' }, { label: 'C', text: 'O(n)' }, { label: 'D', text: 'O(n log n)' }],
        correctOption: 'C',
        explanation: 'Searching an unsorted array requires checking each element — O(n) in the worst case.',
      },
    ],
  },
  {
    title: 'Data Structures - Hard',
    subject: 'Data Structures',
    topic: 'Trees & Graphs',
    difficulty: 'Hard',
    durationMinutes: 30,
    questions: [
      {
        questionText: 'What is the worst-case time complexity of searching in a Binary Search Tree (BST)?',
        options: [{ label: 'A', text: 'O(1)' }, { label: 'B', text: 'O(log n)' }, { label: 'C', text: 'O(n)' }, { label: 'D', text: 'O(n log n)' }],
        correctOption: 'C',
        explanation: 'A skewed (unbalanced) BST degrades to a linked list, making search O(n) in the worst case.',
      },
      {
        questionText: 'Which traversal of a BST gives nodes in sorted order?',
        options: [{ label: 'A', text: 'Pre-order' }, { label: 'B', text: 'In-order' }, { label: 'C', text: 'Post-order' }, { label: 'D', text: 'Level-order' }],
        correctOption: 'B',
        explanation: 'In-order traversal (Left → Root → Right) of a BST visits nodes in ascending sorted order.',
      },
      {
        questionText: 'What does Dijkstra\'s algorithm compute?',
        options: [{ label: 'A', text: 'Minimum spanning tree' }, { label: 'B', text: 'Shortest path from a single source to all vertices' }, { label: 'C', text: 'Topological sort of a DAG' }, { label: 'D', text: 'Strongly connected components' }],
        correctOption: 'B',
        explanation: 'Dijkstra\'s algorithm finds the shortest paths from a single source vertex to all other vertices in a weighted graph.',
      },
      {
        questionText: 'What is the time complexity of Dijkstra\'s algorithm using a min-heap?',
        options: [{ label: 'A', text: 'O(V²)' }, { label: 'B', text: 'O(E log V)' }, { label: 'C', text: 'O(VE)' }, { label: 'D', text: 'O(V log E)' }],
        correctOption: 'B',
        explanation: 'With a binary min-heap, Dijkstra runs in O((V + E) log V) — commonly written as O(E log V) for sparse graphs.',
      },
      {
        questionText: 'Which algorithm is used to detect a cycle in a directed graph?',
        options: [{ label: 'A', text: 'BFS with visited array' }, { label: 'B', text: 'DFS with recursion stack' }, { label: 'C', text: 'Union-Find' }, { label: 'D', text: 'Prim\'s algorithm' }],
        correctOption: 'B',
        explanation: 'DFS with a recursion stack (coloring: white/gray/black) detects back edges which indicate cycles in directed graphs.',
      },
    ],
  },
  {
    title: 'Operating Systems - Medium',
    subject: 'Operating Systems',
    topic: 'Process Management',
    difficulty: 'Medium',
    durationMinutes: 20,
    questions: [
      {
        questionText: 'What are the four necessary conditions for a deadlock to occur?',
        options: [
          { label: 'A', text: 'Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait' },
          { label: 'B', text: 'Starvation, Priority Inversion, Race Condition, Livelock' },
          { label: 'C', text: 'Paging, Segmentation, Swapping, Fragmentation' },
          { label: 'D', text: 'FCFS, SJF, Round Robin, Priority' },
        ],
        correctOption: 'A',
        explanation: 'Coffman\'s four conditions: Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait must ALL hold simultaneously for deadlock.',
      },
      {
        questionText: 'What is thrashing in operating systems?',
        options: [
          { label: 'A', text: 'Excessive context switching due to too many processes' },
          { label: 'B', text: 'A state where the CPU spends more time paging than executing' },
          { label: 'C', text: 'Overflow of the process stack' },
          { label: 'D', text: 'Deadlock between two processes' },
        ],
        correctOption: 'B',
        explanation: 'Thrashing occurs when a process has too few frames, causing continuous page faults and excessive paging activity.',
      },
      {
        questionText: 'Which CPU scheduling algorithm can cause the Convoy Effect?',
        options: [{ label: 'A', text: 'Round Robin' }, { label: 'B', text: 'Shortest Job First' }, { label: 'C', text: 'FCFS' }, { label: 'D', text: 'Priority Scheduling' }],
        correctOption: 'C',
        explanation: 'FCFS (First Come First Served) causes the Convoy Effect when a long CPU-bound process holds short processes behind it.',
      },
      {
        questionText: 'What is the difference between a process and a thread?',
        options: [
          { label: 'A', text: 'A process is lighter weight than a thread' },
          { label: 'B', text: 'A thread is an independent program; a process is a subunit' },
          { label: 'C', text: 'A process has its own memory space; threads share the process memory' },
          { label: 'D', text: 'Threads cannot communicate with each other' },
        ],
        correctOption: 'C',
        explanation: 'A process has its own address space. Threads within the same process share code, data, and heap — making inter-thread communication faster but requiring synchronisation.',
      },
      {
        questionText: 'What does the Banker\'s Algorithm do?',
        options: [
          { label: 'A', text: 'Detects deadlock after it occurs' },
          { label: 'B', text: 'Prevents starvation by aging' },
          { label: 'C', text: 'Avoids deadlock by only granting resources when a safe state is guaranteed' },
          { label: 'D', text: 'Allocates memory using paging' },
        ],
        correctOption: 'C',
        explanation: 'The Banker\'s Algorithm is a deadlock avoidance algorithm that only grants resource requests if the resulting state is provably safe.',
      },
    ],
  },
  {
    title: 'DBMS - Medium',
    subject: 'DBMS',
    topic: 'SQL & Normalisation',
    difficulty: 'Medium',
    durationMinutes: 20,
    questions: [
      {
        questionText: 'What does ACID stand for in database systems?',
        options: [
          { label: 'A', text: 'Atomicity, Consistency, Isolation, Durability' },
          { label: 'B', text: 'Access, Control, Integrity, Data' },
          { label: 'C', text: 'Atomicity, Concurrency, Indexing, Distribution' },
          { label: 'D', text: 'Availability, Consistency, Integrity, Durability' },
        ],
        correctOption: 'A',
        explanation: 'ACID properties ensure reliable database transactions: Atomicity, Consistency, Isolation, and Durability.',
      },
      {
        questionText: 'What is the difference between WHERE and HAVING in SQL?',
        options: [
          { label: 'A', text: 'WHERE filters groups; HAVING filters rows' },
          { label: 'B', text: 'WHERE filters rows before grouping; HAVING filters after GROUP BY' },
          { label: 'C', text: 'They are identical in function' },
          { label: 'D', text: 'HAVING is used with SELECT; WHERE is used with UPDATE only' },
        ],
        correctOption: 'B',
        explanation: 'WHERE filters individual rows before aggregation. HAVING filters the result of GROUP BY aggregations.',
      },
      {
        questionText: 'In what normal form is a table when it has no partial dependencies?',
        options: [{ label: 'A', text: '1NF' }, { label: 'B', text: '2NF' }, { label: 'C', text: '3NF' }, { label: 'D', text: 'BCNF' }],
        correctOption: 'B',
        explanation: '2NF requires 1NF and that all non-key attributes are fully functionally dependent on the entire primary key (no partial dependencies).',
      },
      {
        questionText: 'Which SQL JOIN returns all rows from both tables, with NULLs where there is no match?',
        options: [{ label: 'A', text: 'INNER JOIN' }, { label: 'B', text: 'LEFT JOIN' }, { label: 'C', text: 'RIGHT JOIN' }, { label: 'D', text: 'FULL OUTER JOIN' }],
        correctOption: 'D',
        explanation: 'FULL OUTER JOIN returns all rows from both tables, using NULL for missing matches on either side.',
      },
      {
        questionText: 'What is the difference between DELETE and TRUNCATE in SQL?',
        options: [
          { label: 'A', text: 'DELETE is faster; TRUNCATE is slower' },
          { label: 'B', text: 'DELETE is DDL; TRUNCATE is DML' },
          { label: 'C', text: 'DELETE is DML and is logged row by row; TRUNCATE is DDL and is faster but cannot be rolled back in most DBMS' },
          { label: 'D', text: 'They are functionally identical' },
        ],
        correctOption: 'C',
        explanation: 'DELETE logs each row deletion and can be rolled back. TRUNCATE removes all rows by deallocating pages — faster but generally not rollbackable without explicit transaction support.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

// @desc   Seed mock tests (dev/admin use). Skips tests that already exist.
// @route  POST /api/mock-tests/seed
const seedMockTests = async (req, res) => {
  try {
    let inserted = 0;
    for (const test of SEED_TESTS) {
      const exists = await MockTest.findOne({ title: test.title });
      if (!exists) {
        await MockTest.create(test);
        inserted++;
      }
    }
    res.status(200).json({ message: `Seeded ${inserted} mock test(s).` });
  } catch (err) {
    res.status(500).json({ message: 'Seed failed.' });
  }
};

// @desc   Get all published mock tests (no questions in list — lighter payload)
// @route  GET /api/mock-tests
const getMockTests = async (req, res) => {
  try {
    const tests = await MockTest.find(
      { isPublished: true },
      '-questions'
    ).sort({ subject: 1, difficulty: 1 });

    res.status(200).json(tests);
  } catch (err) {
    console.error('GET MOCK TESTS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc   Get a single mock test WITH questions (needed during test)
// @route  GET /api/mock-tests/:id
const getMockTestById = async (req, res) => {
  try {
    const test = await MockTest.findById(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ message: 'Mock test not found.' });
    }
    // Strip correctOption & explanation before sending to client
    const sanitised = {
      ...test.toObject(),
      questions: test.questions.map((q) => ({
        _id:          q._id,
        questionText: q.questionText,
        options:      q.options,
      })),
    };
    res.status(200).json(sanitised);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch mock test.' });
  }
};

// @desc   Submit a completed mock test attempt. Fires onMockTestCompleted
//         automation event which links the result to a roadmap task and
//         cascades progress updates.
// @route  POST /api/mock-tests/:id/submit
const submitMockTest = async (req, res) => {
  try {
    const { answers, startedAt, timeTakenSeconds } = req.body;

    const test = await MockTest.findById(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ message: 'Mock test not found.' });
    }

    let correctCount   = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const questionResults = test.questions.map((q) => {
      const id       = String(q._id);
      const selected = answers[id] || null;
      const isCorrect = selected === q.correctOption;

      if (!selected)      unansweredCount++;
      else if (isCorrect) correctCount++;
      else                incorrectCount++;

      return {
        questionId:     q._id,
        questionText:   q.questionText,
        options:        q.options,
        correctOption:  q.correctOption,
        selectedOption: selected,
        isCorrect,
        explanation:    q.explanation || '',
      };
    });

    const percentage = Math.round((correctCount / test.questions.length) * 10000) / 100;

    const attempt = await MockTestAttempt.create({
      user:           req.user.id,
      mockTest:       test._id,
      subject:        test.subject,
      topic:          test.topic,
      difficulty:     test.difficulty,
      title:          test.title,
      score:          correctCount,
      totalQuestions: test.questions.length,
      correctCount,
      incorrectCount,
      unansweredCount,
      percentage,
      startedAt:      new Date(startedAt),
      completedAt:    new Date(),
      timeTakenSeconds,
      questionResults,
    });

    // Fire and forget — submit response must not be blocked by automation.
    if (percentage >= test.passingPercentage) automation.onMockTestCompleted(req.user.id, attempt).catch(err =>
      console.error('[Automation] onMockTestCompleted error — attemptId=', attempt._id, err)
    );

    res.status(201).json(attempt);
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit attempt.' });
  }
};

// @desc   Get all attempts by the logged-in user (history — no question results)
// @route  GET /api/mock-tests/attempts
const getUserAttempts = async (req, res) => {
  try {
    const attempts = await MockTestAttempt.find(
      { user: req.user.id },
      '-questionResults'
    ).sort({ completedAt: -1 });
    res.status(200).json(attempts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attempts.' });
  }
};

// @desc   Get a single attempt with full question results (results page)
// @route  GET /api/mock-tests/attempts/:attemptId
const getAttemptById = async (req, res) => {
  try {
    const attempt = await MockTestAttempt.findOne({
      _id:  req.params.attemptId,
      user: req.user.id,
    });
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }
    res.status(200).json(attempt);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attempt.' });
  }
};

// @desc   Get stats for a specific mock test across this user's attempts
// @route  GET /api/mock-tests/:id/stats
const getMockTestStats = async (req, res) => {
  try {
    const attempts = await MockTestAttempt.find(
      { user: req.user.id, mockTest: req.params.id },
      'percentage completedAt timeTakenSeconds score'
    ).sort({ completedAt: -1 });

    if (!attempts.length) {
      return res.status(200).json({
        attemptCount:       0,
        bestPercentage:     null,
        averagePercentage:  null,
        latestAttempt:      null,
      });
    }

    const percentages       = attempts.map(a => a.percentage);
    const bestPercentage    = Math.max(...percentages);
    const averagePercentage = Math.round(
      (percentages.reduce((s, p) => s + p, 0) / percentages.length) * 100
    ) / 100;

    res.status(200).json({
      attemptCount: attempts.length,
      bestPercentage,
      averagePercentage,
      latestAttempt: attempts[0],
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats.' });
  }
};

module.exports = {
  seedMockTests,
  getMockTests,
  getMockTestById,
  submitMockTest,
  getUserAttempts,
  getAttemptById,
  getMockTestStats,
};
