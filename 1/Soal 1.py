def find_intersection(A,B):
    # A, B adalah list berisi int
    set_A = set(A)  #(agar lookup lebih cepat ketimbang list --> immutable)
    set_intersect = set()

    #bandingkan set_A dengan list B
    for element in B:                     #iterasikan setiap element pada B
        if element in set_A:              #jika element tersebut juga ada di set_A
            set_intersect.add(element)    #tambahkan element tersebut pada set_intersect

    return list(set_intersect)

#Contoh testcase
A1 = [1, 2, 3, 4, 5]
B1 = [2, 3, 4, 5, 6]
print(f"Intersection of {A1} and {B1}: {find_intersection(A1, B1)}")

A2 = [1, 2, 2, 3]
B2 = [2, 3, 3, 4]
print(f"Intersection of {A2} and {B2}: {find_intersection(A2, B2)}")

A3 = [1, 5, 2]
B3 = [5, 3, 1]
print(f"Intersection of {A3} and {B3}: {find_intersection(A3, B3)}")