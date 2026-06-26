const CURRICULA = {
  java: {
    introduction: 'Java is a high-level, class-based, object-oriented programming language designed to have as few implementation dependencies as possible. It follows the Write Once, Run Anywhere (WORA) principle via the Java Virtual Machine (JVM).',
    keyConcepts: ['JVM, JRE, JDK', 'OOP: Encapsulation, Inheritance, Polymorphism, Abstraction', 'Primitive types: int, double, boolean, char', 'Classes, Objects, Constructors', 'Interfaces and Abstract Classes', 'Collections Framework: ArrayList, HashMap, LinkedList, HashSet', 'Exception Handling: try-catch-finally', 'Multithreading and Concurrency'],
    importantPoints: ['Java is statically typed — types checked at compile time', 'String is immutable in Java', 'Java passes object references by value', 'The main method: public static void main(String[] args)', 'Garbage Collection is automatic — no manual memory management', 'Java 8 introduced Lambdas, Stream API, and Optional'],
    advantages: ['Platform independent via JVM', 'Strong type system reduces runtime errors', 'Rich standard library and ecosystem', 'Automatic memory management', 'Mature, enterprise-grade tooling (Spring, Maven, Gradle)'],
    disadvantages: ['Verbose compared to Python or Kotlin', 'Slower startup due to JVM overhead', 'Higher memory footprint', 'Boilerplate-heavy code', 'Not ideal for scripting or rapid prototyping'],
    applications: ['Enterprise backend (Spring Boot, Hibernate)', 'Android app development', 'Big Data (Hadoop, Spark)', 'Web servers and REST APIs', 'Financial systems and trading platforms'],
    interviewQuestions: ['What is the difference between JDK, JRE, and JVM?', 'Explain method overloading vs method overriding.', 'What is the difference between abstract class and interface?', 'How does HashMap work internally?', 'What is the difference between checked and unchecked exceptions?', 'Explain the Java memory model: heap vs stack.', 'What are Java Streams and how are they used?'],
    examTips: ['WORA is achieved because bytecode runs on any JVM regardless of OS', 'final keyword: variable = constant, method = cannot override, class = cannot extend', 'static members belong to the class, not instances', 'ArrayList vs LinkedList: ArrayList O(1) access, LinkedList O(1) insert at head', 'HashMap: O(1) average get/put; uses hashCode() and equals()'],
    summary: 'Java remains a dominant enterprise and Android language. Focus on OOP principles, Collections Framework, Exception Handling, and multithreading for interviews.',
    tags: ['java', 'oop', 'jvm', 'programming'],
  },

  python: {
    introduction: 'Python is a high-level, interpreted, dynamically typed language emphasising readability and simplicity. Created by Guido van Rossum in 1991, it is the most widely used language for data science, ML, automation, and web development.',
    keyConcepts: ['Dynamic typing and duck typing', 'Data structures: list, tuple, dict, set', 'Functions, Lambda, and Closures', 'OOP: classes, inheritance, dunder methods', 'List comprehensions and generators', 'Decorators and context managers', 'Modules, packages, and virtual environments', 'Error handling: try/except/finally'],
    importantPoints: ['Python uses indentation to define code blocks', 'Lists are mutable; tuples are immutable', 'dict preserves insertion order from Python 3.7+', 'Everything in Python is an object', 'GIL (Global Interpreter Lock) limits true multithreading in CPython', 'Python is pass-by-object-reference'],
    advantages: ['Beginner-friendly, readable syntax', 'Massive ecosystem: NumPy, Pandas, TensorFlow, Django, FastAPI', 'Rapid development and prototyping', 'Cross-platform', 'Strong community and documentation'],
    disadvantages: ['Slower execution than compiled languages', 'GIL limits CPU-bound multithreading', 'High memory usage relative to C/Java', 'Not suitable for mobile development', 'Runtime type errors due to dynamic typing'],
    applications: ['Data Science and ML (Pandas, Scikit-learn, PyTorch)', 'Web backends (Django, Flask, FastAPI)', 'Scripting and automation', 'AI/LLM tooling (LangChain, HuggingFace)', 'Scientific computing (SciPy, NumPy)'],
    interviewQuestions: ['What is the difference between a list and a tuple?', 'How does Python manage memory?', 'Explain decorators with an example.', 'What is a generator and how does it differ from a list?', 'How does the GIL affect multithreading?', 'What is the difference between @staticmethod and @classmethod?', 'Explain mutable default argument trap.'],
    examTips: ['is checks identity (same object); == checks equality (same value)', 'range() returns a lazy iterable, not a list', '__init__ is not a constructor — __new__ is', 'del removes a variable binding; does not guarantee immediate memory release', 'with statement uses __enter__ and __exit__ dunder methods'],
    summary: 'Python dominates data science, AI, and web development. Master data structures, OOP, generators, and decorators for placement and project interviews.',
    tags: ['python', 'programming', 'scripting', 'data-science'],
  },

  react: {
    introduction: 'React is an open-source JavaScript library developed by Meta (Facebook) for building component-based user interfaces. It uses a Virtual DOM to efficiently update the UI and supports a declarative programming model.',
    keyConcepts: ['Components: Functional and Class', 'JSX — JavaScript XML syntax', 'Props (read-only) and State (mutable)', 'Hooks: useState, useEffect, useContext, useRef, useMemo, useCallback', 'Virtual DOM and Reconciliation', 'React Router for client-side routing', 'Context API for global state', 'Controlled vs Uncontrolled components'],
    importantPoints: ['React re-renders a component when its state or props change', 'Keys help React identify changed list items during reconciliation', 'useEffect with [] runs only on mount; with [dep] on dep change', 'State updates are asynchronous and batched', 'React.memo prevents unnecessary re-renders', 'Hooks can only be called at the top level of a function component'],
    advantages: ['Virtual DOM makes updates performant', 'Component reusability reduces duplication', 'One-way data flow simplifies debugging', 'Huge ecosystem: Next.js, Redux, React Query, Tailwind', 'Strong developer tooling (React DevTools)'],
    disadvantages: ['UI library only — routing, state, and data fetching need external packages', 'Frequent ecosystem churn', 'JSX learning curve for beginners', 'Large bundle size without code splitting'],
    applications: ['Single Page Applications (SPAs)', 'Admin dashboards', 'E-commerce frontends', 'Social media UIs', 'Mobile apps via React Native'],
    interviewQuestions: ['What is the Virtual DOM and how does reconciliation work?', 'Explain the difference between useState and useRef.', 'When would you use useCallback vs useMemo?', 'What is prop drilling and how do you solve it?', 'Explain the React component lifecycle.', 'What is the difference between controlled and uncontrolled components?', 'How does React.memo work?'],
    examTips: ['useState setter triggers a re-render; useRef does not', 'useEffect cleanup function runs before the next effect and on unmount', 'Context re-renders all consumers on value change — use memoisation carefully', 'Key should be stable and unique — avoid array index as key for dynamic lists', 'Lifting state up means moving state to the nearest common ancestor'],
    summary: 'React is the most in-demand frontend library. Master hooks, state management, reconciliation, and component patterns for interviews and real projects.',
    tags: ['react', 'frontend', 'javascript', 'web-development'],
  },

  'data structures': {
    introduction: 'Data Structures are systematic ways of organising, storing, and managing data in memory to enable efficient access and modification. Choosing the right data structure directly determines algorithm efficiency.',
    keyConcepts: ['Arrays and Dynamic Arrays', 'Linked Lists: Singly, Doubly, Circular', 'Stacks (LIFO) and Queues (FIFO)', 'Trees: Binary Tree, BST, AVL, Heap, Trie', 'Graphs: Directed, Undirected, Weighted, DAG', 'Hash Tables and Hash Maps', 'Heaps and Priority Queues', 'Sorting: Merge Sort, Quick Sort, Heap Sort'],
    importantPoints: ['Array: O(1) access, O(n) search (unsorted), O(n) insert/delete', 'Linked List: O(1) insert at head, O(n) search', 'Stack: push/pop/peek all O(1)', 'Queue: enqueue/dequeue O(1) using deque', 'HashMap: O(1) average get/put; O(n) worst case on collision', 'BST: O(log n) average search; O(n) worst if unbalanced', 'Heap: O(log n) insert/delete; O(1) peek min/max'],
    advantages: ['Efficient data organisation improves algorithm complexity', 'Enables solving complex problems (graphs for shortest path)', 'Foundation for all software systems, compilers, and databases'],
    disadvantages: ['Wrong choice causes performance bottlenecks', 'Some structures are complex to implement correctly (balanced trees, graphs)', 'Space-time trade-offs must be evaluated per use case'],
    applications: ['Arrays: image buffers, matrices', 'Linked Lists: LRU Cache, undo history', 'Stack: call stack, expression parsing', 'Queue: BFS, task scheduling', 'HashMap: frequency counting, caching', 'Graph: social networks, GPS routing, dependency resolution'],
    interviewQuestions: ['Explain the difference between Array and Linked List.', 'How does a HashMap handle collisions?', 'What is the difference between BFS and DFS?', 'When would you use a heap over a sorted array?', 'How does a BST differ from an AVL tree?', 'Implement a stack using two queues.', 'Explain Dijkstra\'s algorithm.'],
    examTips: ['BFS uses Queue; DFS uses Stack (or recursion)', 'Heap sort is O(n log n) and in-place but not stable', 'Quick Sort average O(n log n); worst case O(n²) on sorted input without pivot optimisation', 'Trie: O(L) insert/search where L = word length — ideal for prefix matching', 'Graph cycle detection: Union-Find for undirected; DFS with color marking for directed'],
    summary: 'DSA is the core of every technical interview. Master time-space complexity, standard operations, and pattern recognition for arrays, trees, graphs, and hash maps.',
    tags: ['data-structures', 'algorithms', 'dsa', 'placement'],
  },

  'operating systems': {
    introduction: 'An Operating System (OS) is system software that manages computer hardware and software resources and provides services to application programs. It acts as an intermediary between the user, applications, and hardware.',
    keyConcepts: ['Process vs Thread', 'CPU Scheduling Algorithms: FCFS, SJF, Round Robin, Priority', 'Memory Management: Paging, Segmentation, Virtual Memory', 'Deadlocks: conditions, prevention, avoidance (Banker\'s Algorithm)', 'Synchronisation: Mutex, Semaphore, Monitor', 'File System Management', 'I/O Management and Device Drivers', 'Context Switching'],
    importantPoints: ['A process is a running program; a thread is a lightweight unit within a process', 'Deadlock requires all four: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait', 'Thrashing: excessive paging causing more swapping than execution', 'Context switch saves/restores PCB — expensive operation', 'Semaphore P() = wait (decrement); V() = signal (increment)', 'Virtual memory allows running programs larger than physical RAM'],
    advantages: ['Abstracts hardware complexity from developers', 'Enables multitasking and resource sharing', 'Provides security, isolation, and access control'],
    disadvantages: ['OS overhead affects performance (context switching, system calls)', 'OS bugs can crash the entire system', 'Complexity scales with features'],
    applications: ['Desktop OS: Windows, macOS, Linux', 'Mobile OS: Android (Linux kernel), iOS (Darwin)', 'Real-Time OS: FreeRTOS for embedded systems', 'Server OS: Linux for cloud and data centres'],
    interviewQuestions: ['What is the difference between a process and a thread?', 'Explain the four conditions for deadlock.', 'What is the Banker\'s Algorithm?', 'Explain paging vs segmentation.', 'What is the difference between mutex and semaphore?', 'What causes thrashing and how is it prevented?', 'Explain Round Robin scheduling.'],
    examTips: ['Round Robin is most common in time-sharing systems; quantum size affects performance', 'Banker\'s Algorithm avoids deadlock by only granting resources in safe states', 'Internal fragmentation: wasted space inside allocated block (paging)', 'External fragmentation: wasted space between blocks (segmentation)', 'Convoy Effect occurs in FCFS when a CPU-bound process holds short processes behind it'],
    summary: 'OS concepts are mandatory for system design and placement exams. Focus on scheduling algorithms, memory management techniques, deadlock handling, and synchronisation primitives.',
    tags: ['operating-systems', 'os', 'system-design', 'placement'],
  },

  dbms: {
    introduction: 'A Database Management System (DBMS) is software that enables creation, management, and querying of structured data. Relational DBMS (RDBMS) organises data into tables with enforced relationships and ACID properties.',
    keyConcepts: ['ACID: Atomicity, Consistency, Isolation, Durability', 'ER Diagrams and Schema Design', 'SQL: DDL, DML, DCL, TCL', 'Normalisation: 1NF, 2NF, 3NF, BCNF', 'Indexing: B-Tree, Hash Index', 'Transactions and Concurrency Control', 'Joins: INNER, LEFT, RIGHT, FULL OUTER, CROSS', 'NoSQL vs RDBMS'],
    importantPoints: ['Primary Key: unique, not null; Foreign Key: references another table', 'Normalisation reduces redundancy; denormalisation improves read performance', 'Index speeds up read queries but slows write operations', 'Transaction isolation levels: Read Uncommitted, Read Committed, Repeatable Read, Serializable', 'SQL Joins combine rows from multiple tables based on related columns', 'GROUP BY aggregates rows; HAVING filters aggregated results'],
    advantages: ['Data integrity enforced at the database level', 'ACID compliance ensures reliability', 'Structured querying with SQL', 'Concurrent access with transaction management', 'Backup and recovery support'],
    disadvantages: ['Fixed schema requires migration for changes', 'Horizontal scaling is harder than NoSQL', 'Not optimal for unstructured or hierarchical data', 'Complex joins can be expensive at scale'],
    applications: ['Banking and financial systems (ACID critical)', 'E-commerce product and order management', 'ERP and CRM systems', 'Healthcare record management', 'Inventory and supply chain systems'],
    interviewQuestions: ['What is the difference between DELETE, TRUNCATE, and DROP?', 'Explain ACID properties with examples.', 'What is normalisation and why is it needed?', 'What is the difference between clustered and non-clustered index?', 'Explain the difference between HAVING and WHERE.', 'What are different types of SQL Joins?', 'What is a transaction and what are isolation levels?'],
    examTips: ['DELETE is DML (logged, rollbackable); TRUNCATE is DDL (faster, not rollbackable in most DBs)', 'WHERE filters before aggregation; HAVING filters after GROUP BY', '2NF: remove partial dependencies; 3NF: remove transitive dependencies', 'BCNF is stricter than 3NF — every determinant must be a candidate key', 'B-Tree index supports range queries; Hash index only supports equality'],
    summary: 'DBMS is a core placement topic. Master SQL syntax, ACID, normalisation forms, indexing, and join types — these appear in both written tests and technical interviews.',
    tags: ['dbms', 'sql', 'database', 'placement'],
  },
};

function matchCurriculum(topic) {
  const normalised = topic.toLowerCase().trim();
  const match = Object.entries(CURRICULA).find(([key]) => normalised.includes(key));
  return match ? match[1] : null;
}

function buildContent(topic, c) {
  const t = topic.trim();

  if (!c) {
    return `Introduction
${t} is an important concept in computer science and software engineering. This note provides a structured overview.

Key Concepts
- Core principle 1 of ${t}
- Core principle 2 of ${t}
- Core principle 3 of ${t}

Important Points
- ${t} is widely used in [domain]
- Understanding ${t} is essential for [application]
- Key characteristic of ${t}

Advantages
- Advantage 1
- Advantage 2
- Advantage 3

Disadvantages
- Disadvantage 1
- Disadvantage 2

Real World Applications
- Application 1
- Application 2
- Application 3

Interview Questions
- What is ${t} and why is it important?
- Explain the key components of ${t}.
- What are the advantages and disadvantages of ${t}?

Exam Tips
- Remember the core definition of ${t}
- Focus on real-world use cases
- Understand trade-offs

Summary
${t} is a fundamental topic. Review the key concepts and exam tips above before your interview or exam.`;
  }

  return `Introduction
${c.introduction}

Key Concepts
${c.keyConcepts.map((x) => `- ${x}`).join('\n')}

Important Points
${c.importantPoints.map((x) => `- ${x}`).join('\n')}

Advantages
${c.advantages.map((x) => `- ${x}`).join('\n')}

Disadvantages
${c.disadvantages.map((x) => `- ${x}`).join('\n')}

Real World Applications
${c.applications.map((x) => `- ${x}`).join('\n')}

Interview Questions
${c.interviewQuestions.map((x) => `- ${x}`).join('\n')}

Exam Tips
${c.examTips.map((x) => `- ${x}`).join('\n')}

Summary
${c.summary}`;
}

function generateNoteContent(topic) {
  const curriculum = matchCurriculum(topic);
  const content = buildContent(topic, curriculum);
  const title = `Study Notes: ${topic.trim()}`;
  const tags = curriculum
    ? curriculum.tags
    : [topic.toLowerCase().trim().replace(/\s+/g, '-')];

  return {
    title,
    content,
    tags,
    generatedBy: 'AI Generator',
  };
}

module.exports = { generateNoteContent };